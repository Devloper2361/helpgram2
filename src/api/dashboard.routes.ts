import {
  UserRole,
  TaskStatus,
  DisputeStatus,
  TransactionType,
  TransactionStatus,
  VerificationStatus,
  NotificationType,
  MessageType,
  OrganizationStatus,
  MembershipStatus,
  MembershipRole,
  ClaimStatus,
} from "../lib/enums.js";
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const router = Router();

const getJwtSecret = () => process.env.JWT_SECRET || "fallback-secret";

const authenticate = (req: any, res: any, next: any) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) return res.status(401).json({ error: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as {
      userId: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// GET /api/dashboard (General user dashboard)
router.get("/", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const [wallet, profile, myRecentTasks, suggestedTasks] = await Promise.all([
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.profile.findUnique({ where: { userId } }),
      prisma.task.findMany({
        where: { OR: [{ requesterId: userId }, { taskerId: userId }] },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.task.findMany({
        where: { status: TaskStatus.OPEN, requesterId: { not: userId } },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

    const activeTasksCount = await prisma.task.count({
      where: {
        OR: [{ requesterId: userId }, { taskerId: userId }],
        status: {
          in: [
            TaskStatus.OPEN,
            TaskStatus.ACCEPTED,
            TaskStatus.IN_PROGRESS,
            TaskStatus.PROOF_SUBMITTED,
          ],
        },
      },
    });

    res.json({
      walletBalance: wallet?.balanceAvailable || 0,
      escrowBalance: wallet?.balanceEscrowed || 0,
      trustScore: profile?.trustScore || 5.0,
      activeTasksCount,
      myRecentTasks,
      suggestedTasks,
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/society
router.get("/society", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    let targetSocietyId = req.query.societyId as string | undefined;

    if (userRole === "SOCIETY_ADMIN") {
      if (targetSocietyId) {
        const membership = await prisma.societyMembership.findFirst({
          where: {
            userId,
            societyId: targetSocietyId,
            role: "ADMIN",
            status: "ACTIVE",
          },
        });
        if (!membership) {
          return res
            .status(403)
            .json({ error: "Forbidden: Not an active admin of this society" });
        }
      } else {
        const membership = await prisma.societyMembership.findFirst({
          where: {
            userId,
            role: "ADMIN",
            status: "ACTIVE",
          },
        });
        if (!membership) {
          return res
            .status(403)
            .json({ error: "Forbidden: Not an active admin of any society" });
        }
        targetSocietyId = membership.societyId;
      }
    } else if (userRole === "FEDERATION_ADMIN") {
      if (!targetSocietyId) {
        return res
          .status(400)
          .json({ error: "societyId query parameter is required" });
      }
      const society = await prisma.cooperativeSociety.findUnique({
        where: { id: targetSocietyId },
      });
      if (!society) {
        return res.status(404).json({ error: "Society not found" });
      }
      const membership = await prisma.federationMembership.findUnique({
        where: {
          userId_federationId: {
            userId,
            federationId: society.federationId,
          },
        },
      });
      if (
        !membership ||
        membership.role !== "ADMIN" ||
        membership.status !== "ACTIVE"
      ) {
        return res
          .status(403)
          .json({ error: "Forbidden: Not an active admin of this federation" });
      }
    } else if (userRole === "PLATFORM_ADMIN" || userRole === "ADMIN") {
      if (targetSocietyId) {
        const society = await prisma.cooperativeSociety.findUnique({
          where: { id: targetSocietyId },
        });
        if (!society) {
          return res.status(404).json({ error: "Society not found" });
        }
      }
    } else {
      return res
        .status(403)
        .json({ error: "Forbidden: Insufficient permissions" });
    }

    const members = await prisma.societyMembership.findMany({
      where: targetSocietyId
        ? { societyId: targetSocietyId, role: "MEMBER" }
        : { role: "MEMBER" },
      select: { userId: true, status: true },
    });

    const totalWorkers = members.length;
    const activeWorkers = members.filter((m) => m.status === "ACTIVE").length;
    const pendingApplications = members.filter(
      (m) => m.status === "PENDING",
    ).length;

    const memberIds = members.map((m) => m.userId);

    let totalTasks = 0;
    let completedTasks = 0;
    let grossCompletedBookingValue = 0;
    let platformFees = 0;

    if (memberIds.length > 0) {
      const tasks = await prisma.task.findMany({
        where: { taskerId: { in: memberIds } },
        select: { id: true, status: true, price: true },
      });

      totalTasks = tasks.length;
      const completedList = tasks.filter((t) => t.status === "COMPLETED");
      completedTasks = completedList.length;
      grossCompletedBookingValue = completedList.reduce(
        (sum, t) => sum + Number(t.price),
        0,
      );

      const completedTaskIds = completedList.map((t) => t.id);
      if (completedTaskIds.length > 0) {
        const prs = await prisma.platformRevenue.findMany({
          where: { taskId: { in: completedTaskIds } },
          select: { amount: true },
        });
        platformFees = prs.reduce((sum, pr) => sum + Number(pr.amount), 0);
      }
    }

    res.json({
      totalWorkers,
      activeWorkers,
      pendingApplications,
      totalTasks,
      completedTasks,
      grossCompletedBookingValue,
      platformFees,
    });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/federation
router.get("/federation", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    let targetFederationId = req.query.federationId as string | undefined;

    if (userRole === "FEDERATION_ADMIN") {
      if (targetFederationId) {
        const membership = await prisma.federationMembership.findUnique({
          where: {
            userId_federationId: {
              userId,
              federationId: targetFederationId,
            },
          },
        });
        if (
          !membership ||
          membership.role !== "ADMIN" ||
          membership.status !== "ACTIVE"
        ) {
          return res
            .status(403)
            .json({
              error: "Forbidden: Not an active admin of this federation",
            });
        }
      } else {
        const membership = await prisma.federationMembership.findFirst({
          where: {
            userId,
            role: "ADMIN",
            status: "ACTIVE",
          },
        });
        if (!membership) {
          return res
            .status(403)
            .json({
              error: "Forbidden: Not an active admin of any federation",
            });
        }
        targetFederationId = membership.federationId;
      }
    } else if (userRole === "PLATFORM_ADMIN" || userRole === "ADMIN") {
      if (targetFederationId) {
        const federation = await prisma.cooperativeFederation.findUnique({
          where: { id: targetFederationId },
        });
        if (!federation) {
          return res.status(404).json({ error: "Federation not found" });
        }
      }
    } else {
      return res
        .status(403)
        .json({ error: "Forbidden: Insufficient permissions" });
    }

    // Step 1: Fetch all societies in this federation
    const societies = await prisma.cooperativeSociety.findMany({
      where: targetFederationId ? { federationId: targetFederationId } : {},
      select: { id: true, name: true },
    });

    const totalSocieties = societies.length;
    const societyIds = societies.map((s) => s.id);

    if (societyIds.length === 0) {
      return res.json({
        totalSocieties: 0,
        totalWorkers: 0,
        activeWorkers: 0,
        pendingApplications: 0,
        totalTasks: 0,
        completedTasks: 0,
        grossCompletedBookingValue: 0,
        platformFees: 0,
        societyPerformance: [],
      });
    }

    // Step 2: Fetch all MEMBER memberships across all these societies in 1 query
    const allMemberships = await prisma.societyMembership.findMany({
      where: {
        societyId: { in: societyIds },
        role: "MEMBER",
      },
      select: {
        societyId: true,
        userId: true,
        status: true,
      },
    });

    // Group memberships by society
    const societyMembersMap = new Map<string, typeof allMemberships>();
    const allWorkerIdsSet = new Set<string>();
    const activeWorkerIdsSet = new Set<string>();
    const pendingWorkerIdsSet = new Set<string>();

    // Map each worker to a single primary society (the first one they joined, or just the first one we see)
    // to prevent double-counting their tasks in societyPerformance.
    const workerPrimarySocietyMap = new Map<string, string>();

    for (const m of allMemberships) {
      if (!societyMembersMap.has(m.societyId)) {
        societyMembersMap.set(m.societyId, []);
      }
      societyMembersMap.get(m.societyId)!.push(m);
      allWorkerIdsSet.add(m.userId);
      if (m.status === "ACTIVE") activeWorkerIdsSet.add(m.userId);
      if (m.status === "PENDING") pendingWorkerIdsSet.add(m.userId);

      // Assign primary society for task deduplication
      if (!workerPrimarySocietyMap.has(m.userId)) {
        workerPrimarySocietyMap.set(m.userId, m.societyId);
      }
    }

    const totalWorkers = allWorkerIdsSet.size;
    const activeWorkers = activeWorkerIdsSet.size;
    const pendingApplications = pendingWorkerIdsSet.size;

    const allWorkerIds = Array.from(allWorkerIdsSet);

    // Step 3: Fetch all tasks performed by these workers in 1 query
    let allTasks: Array<{
      id: string;
      taskerId: string | null;
      status: TaskStatus;
      price: any;
    }> = [];
    if (allWorkerIds.length > 0) {
      allTasks = await prisma.task.findMany({
        where: { taskerId: { in: allWorkerIds } },
        select: { id: true, taskerId: true, status: true, price: true },
      });
    }

    const totalTasks = allTasks.length;
    const completedTasksList = allTasks.filter((t) => t.status === "COMPLETED");
    const completedTasks = completedTasksList.length;
    const grossCompletedBookingValue = completedTasksList.reduce(
      (sum, t) => sum + Number(t.price),
      0,
    );

    // Step 4: Fetch all platform revenues for completed tasks in 1 query
    const completedTaskIds = completedTasksList.map((t) => t.id);
    let platformRevenues: Array<{ taskId: string | null; amount: any }> = [];
    if (completedTaskIds.length > 0) {
      platformRevenues = await prisma.platformRevenue.findMany({
        where: { taskId: { in: completedTaskIds } },
        select: { taskId: true, amount: true },
      });
    }

    const totalPlatformFees = platformRevenues.reduce(
      (sum, pr) => sum + Number(pr.amount),
      0,
    );

    // Group tasks and platform fees by tasker/task for in-memory calculation
    const taskerTasksMap = new Map<string, typeof allTasks>();
    for (const t of allTasks) {
      if (t.taskerId) {
        if (!taskerTasksMap.has(t.taskerId)) {
          taskerTasksMap.set(t.taskerId, []);
        }
        taskerTasksMap.get(t.taskerId)!.push(t);
      }
    }

    const taskRevenueMap = new Map<string, number>();
    for (const pr of platformRevenues) {
      if (pr.taskId) {
        taskRevenueMap.set(pr.taskId, Number(pr.amount));
      }
    }

    // Step 5: Assemble societyPerformance array in memory
    const societyPerformance = societies.map((soc) => {
      const socMembers = societyMembersMap.get(soc.id) || [];
      const socTotalWorkers = socMembers.length;
      const socActiveWorkers = socMembers.filter(
        (m) => m.status === "ACTIVE",
      ).length;
      const socPendingApps = socMembers.filter(
        (m) => m.status === "PENDING",
      ).length;

      let socTotalTasks = 0;
      let socCompletedTasks = 0;
      let socGrossValue = 0;
      let socPlatformFees = 0;

      for (const m of socMembers) {
        // Only count tasks if this society is their primary society to avoid double counting
        if (workerPrimarySocietyMap.get(m.userId) === soc.id) {
          const userTasks = taskerTasksMap.get(m.userId) || [];
          socTotalTasks += userTasks.length;
          for (const t of userTasks) {
            if (t.status === "COMPLETED") {
              socCompletedTasks += 1;
              socGrossValue += Number(t.price);
              socPlatformFees += taskRevenueMap.get(t.id) || 0;
            }
          }
        }
      }

      return {
        societyId: soc.id,
        societyName: soc.name,
        totalWorkers: socTotalWorkers,
        activeWorkers: socActiveWorkers,
        pendingApplications: socPendingApps,
        totalTasks: socTotalTasks,
        completedTasks: socCompletedTasks,
        grossCompletedBookingValue: socGrossValue,
        platformFees: socPlatformFees,
      };
    });

    res.json({
      totalSocieties,
      totalWorkers,
      activeWorkers,
      pendingApplications,
      totalTasks,
      completedTasks,
      grossCompletedBookingValue,
      platformFees: totalPlatformFees,
      societyPerformance,
    });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
