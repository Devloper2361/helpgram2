import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "../lib/enums.js";
import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

import { authenticate } from "./middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const createCertSchema = z.object({
  skillId: z.string().uuid(),
  evidence: z.string().url().max(1024).optional()
});

router.post("/", authenticate, async (req: any, res: any) => {
  try {
    const { skillId, evidence } = createCertSchema.parse(req.body);
    const userId = req.user.userId;

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { skills: true }
    });

    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const hasSkill = profile.skills.some(s => s.id === skillId);
    if (!hasSkill) {
      return res.status(403).json({ error: "Cannot certify a skill you have not claimed" });
    }

    const existingCert = await prisma.certification.findUnique({
      where: { profileId_skillId: { profileId: profile.id, skillId } }
    });

    if (existingCert) {
      if (existingCert.status === VerificationStatus.PENDING) {
        return res.status(400).json({ error: "Certification is already pending" });
      }
      if (existingCert.status === VerificationStatus.VERIFIED) {
        return res.status(400).json({ error: "Skill is already verified" });
      }
      
      const updated = await prisma.certification.update({
        where: { id: existingCert.id },
        data: {
          status: VerificationStatus.PENDING,
          evidence: evidence || null,
          verifiedById: null,
          verifiedAt: null,
          expiresAt: null
        }
      });
      return res.status(200).json({ certification: updated });
    }

    const cert = await prisma.certification.create({
      data: {
        profileId: profile.id,
        skillId,
        evidence: evidence || null,
        status: VerificationStatus.PENDING
      }
    });

    res.status(201).json({ certification: cert });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/me", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const certifications = await prisma.certification.findMany({
      where: { profileId: profile.id },
      include: { skill: true }
    });
    res.json({ certifications });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const statusSchema = z.object({
  status: z.enum([VerificationStatus.VERIFIED, VerificationStatus.REJECTED, VerificationStatus.PENDING]),
  expiresAt: z.string().datetime().optional().nullable()
});

router.post("/:id/status", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, expiresAt } = statusSchema.parse(req.body);
    const adminId = req.user.userId;
    
    const adminUser = await prisma.user.findUnique({
      where: { id: adminId },
      include: { 
        societyMemberships: { include: { society: true } },
        federationMemberships: { include: { federation: true } }
      }
    });
    if (!adminUser) return res.status(401).json({ error: "Unauthorized" });

    const isPlatformAdmin = adminUser.role === "PLATFORM_ADMIN" || adminUser.role === "ADMIN";

    const cert = await prisma.certification.findUnique({
      where: { id },
      include: { profile: { include: { user: { include: { societyMemberships: { include: { society: true } } } } } } }
    });

    if (!cert) return res.status(404).json({ error: "Certification not found" });

    // Transition Logic Enforcement
    if (cert.status === VerificationStatus.VERIFIED && status !== VerificationStatus.VERIFIED) {
      return res.status(403).json({ error: "Cannot transition from VERIFIED to another status." });
    }
    if (cert.status === VerificationStatus.REJECTED && status === VerificationStatus.VERIFIED) {
      return res.status(403).json({ error: "Cannot directly approve a rejected certification. Worker must re-submit." });
    }

    // Authorization Check
    let isAuthorized = isPlatformAdmin;
    if (!isAuthorized) {
       const workerSocietyIds = cert.profile.user.societyMemberships.map((m: any) => m.societyId);
       const workerFederationIds = cert.profile.user.societyMemberships.map((m: any) => m.society.federationId);
       
       if (adminUser.role === "SOCIETY_ADMIN") {
         const adminSocietyIds = adminUser.societyMemberships.filter((m: any) => m.role === "ADMIN" && m.status === "ACTIVE").map((m: any) => m.societyId);
         isAuthorized = adminSocietyIds.some((id: string) => workerSocietyIds.includes(id));
       } else if (adminUser.role === "FEDERATION_ADMIN") {
         const adminFedIds = adminUser.federationMemberships.filter((m: any) => m.role === "ADMIN" && m.status === "ACTIVE").map((m: any) => m.federationId);
         isAuthorized = adminFedIds.some((id: string) => workerFederationIds.includes(id));
       }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Not authorized to review this worker's certification" });
    }

    const updated = await prisma.certification.update({
      where: { id },
      data: {
        status,
        verifiedById: adminId,
        verifiedAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null
      }
    });

    // Notify worker
    try {
      await prisma.notification.create({
        data: {
          userId: cert.profile.userId,
          type: "SYSTEM",
          content: `Your skill certification request has been ${status.toLowerCase()}.`,
          relatedEntityId: cert.id
        }
      });
    } catch (e) { console.error("Notification failed", e); }

    res.json({ certification: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin list certifications
router.get("/", authenticate, async (req: any, res: any) => {
  try {
    const adminId = req.user.userId;
    const adminUser = await prisma.user.findUnique({
      where: { id: adminId },
      include: { 
        societyMemberships: { include: { society: true } },
        federationMemberships: { include: { federation: true } }
      }
    });
    if (!adminUser) return res.status(401).json({ error: "Unauthorized" });

    const isPlatformAdmin = adminUser.role === "PLATFORM_ADMIN" || adminUser.role === "ADMIN";

    let whereClause: any = {};
    if (!isPlatformAdmin) {
       const societyIds: string[] = [];
       const federationIds: string[] = [];
       
       if (adminUser.role === "SOCIETY_ADMIN") {
         for (const m of adminUser.societyMemberships) {
           if (m.role === "ADMIN" && m.status === "ACTIVE") societyIds.push(m.societyId);
         }
       } else if (adminUser.role === "FEDERATION_ADMIN") {
         for (const m of adminUser.federationMemberships) {
           if (m.role === "ADMIN" && m.status === "ACTIVE") federationIds.push(m.federationId);
         }
       }
       
       if (societyIds.length === 0 && federationIds.length === 0) {
         return res.status(403).json({ error: "Not authorized" });
       }
       
       const orConditions = [];
       if (societyIds.length > 0) {
         orConditions.push({ societyId: { in: societyIds } });
       }
       if (federationIds.length > 0) {
         orConditions.push({ society: { federationId: { in: federationIds } } });
       }

       whereClause = {
         profile: {
           user: {
             societyMemberships: {
               some: {
                 OR: orConditions
               }
             }
           }
         }
       };
    }

    const { status } = req.query;
    if (status) {
       whereClause.status = status;
    }

    const certifications = await prisma.certification.findMany({
      where: whereClause,
      include: { 
        skill: true,
        profile: { include: { user: { select: { email: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ certifications });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
