import { generateContentWithRetry } from "../lib/ai-helper";
import { Router } from "express";
import { authenticate } from "./middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { UserRole, MembershipRole, MembershipStatus, TaskStatus, NotificationType } from "../lib/enums.js";
import { z } from "zod";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { checkWorkerEligibility } from "../lib/workerEligibility.js";

const router = Router();

// Middleware to verify active society admin
const requireSocietyAdmin = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.userId;
    const membership = await prisma.societyMembership.findFirst({
      where: { userId, status: MembershipStatus.ACTIVE, role: MembershipRole.ADMIN }
    });
    if (!membership) {
      return res.status(403).json({ error: "Forbidden. Must be an active Society Admin." });
    }
    req.societyId = membership.societyId;
    next();
  } catch (err) {
    res.status(500).json({ error: "Authorization error" });
  }
};

router.get("/opportunities", authenticate, requireSocietyAdmin, async (req: any, res: any) => {
  try {
    const societyId = req.societyId;
    const society = await prisma.cooperativeSociety.findUnique({ where: { id: societyId } });
    if (!society) return res.status(404).json({ error: "Society not found" });

    const opportunities = await prisma.institutionalOpportunity.findMany({
      where: {
        OR: [
          { societyId },
          { federationId: society.federationId }
        ],
        status: "DRAFT"
      },
      include: {
        ServiceCategory: true
      }
    });

    // Find claimed tasks by admins of this society
    const societyAdmins = await prisma.societyMembership.findMany({
      where: { societyId, status: MembershipStatus.ACTIVE, role: MembershipRole.ADMIN }
    });
    const adminIds = societyAdmins.map(m => m.userId);

    const parentTasks = await prisma.task.findMany({
      where: {
        requesterId: { in: adminIds },
        
      },
      
    });

    res.json({ opportunities, parentTasks });
  } catch (err: any) {
    if (err.message === "RaceCondition") return res.status(400).json({ error: "Opportunity already claimed or unavailable" });
    res.status(500).json({ error: err.message });
  }
});

router.post("/opportunities/:id/claim", authenticate, requireSocietyAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const societyId = req.societyId;
    const userId = req.user.userId;

    const society = await prisma.cooperativeSociety.findUnique({ where: { id: societyId } });
    if (!society) return res.status(404).json({ error: "Society not found" });

    const opp = await prisma.institutionalOpportunity.findUnique({ where: { id } });
    if (!opp) return res.status(404).json({ error: "Opportunity not found" });

    if (opp.societyId && opp.societyId !== societyId) {
      return res.status(403).json({ error: "Opportunity belongs to another society" });
    }
    if (opp.federationId && opp.federationId !== society.federationId) {
      return res.status(403).json({ error: "Opportunity belongs to another federation" });
    }
    if (opp.status !== "DRAFT") {
      return res.status(400).json({ error: "Opportunity already claimed or unavailable" });
    }
    // Claim race protection is enforced in the update query

    // Claim it
    
    const updatedOpp = await prisma.institutionalOpportunity.update({
      where: { id: id, status: "DRAFT" },
      data: { status: "CLAIMED", societyId: societyId }
    }).catch(err => {
      if (err.code === 'P2025') throw new Error("RaceCondition");
      throw err;
    });


    // We need a generic service to attach to the parent task. Let's find one belonging to the category if possible, or any active service.
    let serviceId = null;
    if (opp.serviceCategoryId) {
      const s = await prisma.service.findFirst({ where: { categoryId: opp.serviceCategoryId, status: "ACTIVE" } });
      if (s) serviceId = s.id;
    }
    if (!serviceId) {
      const s = await prisma.service.findFirst({ where: { status: "ACTIVE" } });
      if (s) serviceId = s.id;
    }

    const task = await prisma.task.create({
      data: {
        requesterId: userId, // The admin is the requester for the parent task
        serviceId: serviceId,
        title: opp.title,
        description: opp.description,
        price: opp.budget || 0,
        status: "OPEN",
        
        scheduledFor: opp.deadline || new Date(Date.now() + 86400000 * 7), // 1 week from now if none
        locationLat: opp.locationLat || 0,
        locationLng: opp.locationLng || 0,
      }
    });

    res.json({ message: "Opportunity claimed", task });
  } catch (err: any) {
    if (err.message === "RaceCondition") return res.status(400).json({ error: "Opportunity already claimed or unavailable" });
    res.status(500).json({ error: err.message });
  }
});

router.post("/parent/:taskId/ai-plan", authenticate, requireSocietyAdmin, async (req: any, res: any) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;
    const societyId = req.societyId;

    const parentTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!parentTask) return res.status(404).json({ error: "Parent task not found" });
    

    // Verify society boundary: The requester must be an active admin of THIS society.
    // We already verified the current user is an active admin of `societyId`.
    // Now verify the parent task's requester belongs to the same society as an admin.
    const requesterMembership = await prisma.societyMembership.findFirst({
      where: { userId: parentTask.requesterId, societyId: societyId, status: MembershipStatus.ACTIVE, role: MembershipRole.ADMIN }
    });
    if (!requesterMembership) {
      return res.status(403).json({ error: "Unauthorized. Parent task belongs to another society." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const schema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          requiredSkills: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          recommendedWorkerCount: { type: Type.INTEGER },
          allocatedBudget: { type: Type.NUMBER }
        },
        required: ["title", "description", "requiredSkills", "recommendedWorkerCount", "allocatedBudget"]
      }
    };

        const activeSkills = await prisma.skill.findMany({ select: { name: true } });
    const skillList = activeSkills.map(s => s.name).join(", ");

    const prompt = `
You are an expert workforce allocator for a labor cooperative.
Decompose the following institutional contract into smaller, specific executable sub-tasks.
- Maximum of 10 sub-tasks.
- The total sum of allocatedBudget for all sub-tasks MUST NOT exceed ${parentTask.price}.
- recommendedWorkerCount must be realistic (usually 1-5 per task).
- IMPORTANT: You MUST ONLY select requiredSkills from this exact list: [${skillList}]. Do not invent skills.

Contract Title: ${parentTask.title}
Contract Description: ${parentTask.description}
Total Budget: ${parentTask.price}
`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const result = response.text ? JSON.parse(response.text) : [];
    res.json({ plan: result });
  } catch (err: any) {
    if (err.message === "RaceCondition") return res.status(400).json({ error: "Opportunity already claimed or unavailable" });
    res.status(500).json({ error: err.message });
  }
});

const planSchema = z.array(
  z.object({
    title: z.string().min(5),
    description: z.string().min(10),
    requiredSkills: z.array(z.string()).min(1),
    recommendedWorkerCount: z.number().int().positive().max(50),
    allocatedBudget: z.number().positive(),
  })
).min(1).max(10);

router.post("/parent/:taskId/commit-plan", authenticate, requireSocietyAdmin, async (req: any, res: any) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;
    const societyId = req.societyId;
    const planData = req.body;

    // Validate structure
    const parsedPlan = planSchema.safeParse(planData);
    if (!parsedPlan.success) {
      return res.status(400).json({ error: "Invalid plan format", details: parsedPlan.error.errors });
    }
    const plan = parsedPlan.data;

    const parentTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!parentTask) return res.status(404).json({ error: "Parent task not found" });
    

    // Verify society boundary
    const requesterMembership = await prisma.societyMembership.findFirst({
      where: { userId: parentTask.requesterId, societyId: societyId, status: MembershipStatus.ACTIVE, role: MembershipRole.ADMIN }
    });
    if (!requesterMembership) {
      return res.status(403).json({ error: "Unauthorized. Parent task belongs to another society." });
    }

    // Duplicate protection
    const existingSubtasks = await prisma.task.count({ where: {  } });
    if (existingSubtasks > 0) return res.status(409).json({ error: "Plan already committed." });

    // Financial Validation
    const totalBudget = plan.reduce((sum, item) => sum + item.allocatedBudget, 0);
    if (totalBudget > parentTask.price) {
      return res.status(400).json({ error: "Sub-task budgets exceed parent contract value." });
    }

    // Skill Validation
    const allSkillsRequested = Array.from(new Set(plan.flatMap(p => p.requiredSkills)));
    const existingSkills = await prisma.skill.findMany({
      where: { name: { in: allSkillsRequested } }
    });
    const existingSkillNames = new Set(existingSkills.map(s => s.name));
    
    for (const skillName of allSkillsRequested) {
      if (!existingSkillNames.has(skillName)) {
        return res.status(400).json({ error: `The AI recommended an unrecognized skill: ${skillName}. Please edit the plan.` });
      }
    }

    // Create subtasks
    const subTasks = [];
    for (const item of plan) {
      const skillsToConnect = item.requiredSkills.map(skillName => {
        const s = existingSkills.find(s => s.name === skillName);
        return s ? s.id : null;
      }).filter(Boolean) as string[];

      const subTask = await prisma.task.create({
        data: {
          requesterId: userId,
          serviceId: parentTask.serviceId, // inherit service
          title: item.title,
          description: item.description,
          price: item.allocatedBudget,
          workerCount: item.recommendedWorkerCount,
          status: "DRAFT",
          
          
          scheduledFor: parentTask.scheduledFor,
          locationLat: parentTask.locationLat,
          locationLng: parentTask.locationLng,
          skills: {
            create: skillsToConnect.map(skillId => ({
              skillId
            }))
          }
        }
      });
      subTasks.push(subTask);
    }

    res.json({ message: "Plan committed successfully", subTasks });
  } catch (err: any) {
    if (err.message === "RaceCondition") return res.status(400).json({ error: "Opportunity already claimed or unavailable" });
    res.status(500).json({ error: err.message });
  }
});

router.post("/subtasks/:taskId/dispatch", authenticate, requireSocietyAdmin, async (req: any, res: any) => {
  try {
    const { taskId } = req.params;
    const userId = req.user.userId;
    const societyId = req.societyId;

    const subTask = await prisma.task.findUnique({ 
      where: { id: taskId },
      include: {
        skills: true,
        parentTask: true
      }
    });

    if (!subTask) return res.status(404).json({ error: "Subtask not found" });
    
    if (!subTask.parentTask) return res.status(400).json({ error: "Parent task not found" });

    // Verify boundary
    const requesterMembership = await prisma.societyMembership.findFirst({
      where: { userId: subTask.parentTask.requesterId, societyId: societyId, status: MembershipStatus.ACTIVE, role: MembershipRole.ADMIN }
    });
    if (!requesterMembership) {
      return res.status(403).json({ error: "Unauthorized. Parent task belongs to another society." });
    }

    const updatedSubTask = await prisma.task.updateMany({
      where: { id: taskId, status: "DRAFT" },
      data: { status: "OPEN" }
    });
    console.log("updateMany count:", updatedSubTask.count);
    if (updatedSubTask.count === 0) {
      return res.status(409).json({ error: "Task already dispatched or unavailable" });
    }

    
    const recommendedCount = subTask.workerCount;

    // Use FairShare ranking to find and rank eligible workers
    const { findAndRankEligibleWorkers } = await import("../lib/fairShare.js");
    const rankedWorkers = await findAndRankEligibleWorkers(taskId);
    
    // Select the required number of workers
    const selectedWorkers = rankedWorkers.slice(0, recommendedCount);

    let eligibleCount = 0;
    for (const stat of selectedWorkers) {
        // Send notification
        await prisma.notification.create({
          data: {
            userId: stat.workerId,
            type: NotificationType.SYSTEM,
            relatedEntityId: taskId, // Safe idempotency key
            content: `New Institutional Task Dispatched: ${subTask.title}`,
            isRead: false
          }
        });
        eligibleCount++;
    }

    // Update the task version to ensure we can track changes if necessary, and maybe add a dispatch tag
    await prisma.task.update({
      where: { id: taskId },
      data: { 
        }
    });

    res.json({ message: `Dispatched to ${eligibleCount} eligible workers.` });

  } catch (err: any) {
    if (err.message === "RaceCondition") return res.status(400).json({ error: "Opportunity already claimed or unavailable" });
    res.status(500).json({ error: err.message });
  }
});

export default router;
