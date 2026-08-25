import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "../lib/enums.js";
import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

import jwt from "jsonwebtoken";
import { refundFundsTx, releaseFundsTx, partialReleaseFundsTx, WalletError } from "../lib/wallet.js";
import { updateMetricsAndTrust } from "../lib/trust.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const getJwtSecret = () => process.env.JWT_SECRET as string;

const authenticateAdmin = (req: any, res: any, next: any) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string, role: string };
    if (decoded.role !== "ADMIN" && decoded.role !== "PLATFORM_ADMIN") {
       return res.status(403).json({ error: "Admin access required" });
    }
    req.user = decoded;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

router.use(authenticateAdmin);

router.get("/disputes", async (req: any, res: any) => {
  try {
    const { page = "1", limit = "10", status } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;
    const take = limitNum;

    const where: any = {};
    if (status) {
      where.status = status as DisputeStatus;
    }

    const disputes = await prisma.dispute.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        task: {
          select: { id: true, title: true, price: true, status: true, escrowEntry: true }
        },
        raisedBy: {
          select: { id: true, email: true }
        }
      }
    });

    const total = await prisma.dispute.count({ where });

    res.json({ disputes, total, page: pageNum, limit: take });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/disputes/:id/refund", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { task: true }
    });

    if (!dispute) return res.status(404).json({ error: "Dispute not found" });
    if (dispute.status === DisputeStatus.RESOLVED_REFUNDED || dispute.status === DisputeStatus.RESOLVED_RELEASED) {
      return res.status(400).json({ error: "Dispute already resolved" });
    }

    const updatedDispute = await prisma.$transaction(async (tx) => {
      // 1. Mark dispute resolved
      const resolved = await tx.dispute.update({
        where: { id: dispute.id, version: dispute.version },
        data: {
          status: DisputeStatus.RESOLVED_REFUNDED,
          resolution: req.body.resolution || "Refunded by admin",
          version: { increment: 1 }
        }
      });

      // 2. Cancel Task
      await tx.task.update({
        where: { id: dispute.taskId, version: dispute.task.version },
        data: {
          status: TaskStatus.CANCELLED,
          cancelledAt: new Date(),
          version: { increment: 1 }
        }
      });

      // 3. Refund Escrow
      const escrowEntry = await tx.escrowEntry.findUnique({ where: { taskId: dispute.taskId } });
      if (escrowEntry && (escrowEntry.status === "LOCKED" || escrowEntry.status === "DISPUTED")) {
        await refundFundsTx(tx, {
          taskId: dispute.taskId,
          idempotencyKey: `dispute_refund_${dispute.id}`
        });
      }

      // 4. Audit Log
      await tx.adminLog.create({
        data: {
          adminId,
          action: "DISPUTE_REFUND",
          entityType: "DISPUTE",
          entityId: id,
          details: JSON.stringify({ taskId: dispute.taskId })
        }
      });

      return resolved;
    }, { maxWait: 15000, timeout: 15000 });

    try {
      await updateMetricsAndTrust(prisma, dispute.task.requesterId);
      if (dispute.task.taskerId) await updateMetricsAndTrust(prisma, dispute.task.taskerId);
    } catch (e) {}

    res.json({ dispute: updatedDispute });
  } catch (error: any) {
    if (error instanceof WalletError) return res.status(400).json({ error: error.message });
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error);
    res.status(500).json({ error: "Internal server error details: " + error.message });
  }
});

router.post("/disputes/:id/payout", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { task: true }
    });

    if (!dispute) return res.status(404).json({ error: "Dispute not found" });
    if (dispute.status === DisputeStatus.RESOLVED_REFUNDED || dispute.status === DisputeStatus.RESOLVED_RELEASED) {
      return res.status(400).json({ error: "Dispute already resolved" });
    }

    if (!dispute.task.taskerId) {
      return res.status(400).json({ error: "No tasker assigned to payout to" });
    }

    const taskerWallet = await prisma.wallet.findUnique({ where: { userId: dispute.task.taskerId } });
    if (!taskerWallet) return res.status(400).json({ error: "Tasker has no wallet" });

    const updatedDispute = await prisma.$transaction(async (tx) => {
      // 1. Mark dispute resolved
      const resolved = await tx.dispute.update({
        where: { id: dispute.id, version: dispute.version },
        data: {
          status: DisputeStatus.RESOLVED_RELEASED,
          resolution: req.body.resolution || "Payout to tasker by admin",
          version: { increment: 1 }
        }
      });

      // 2. Complete Task
      await tx.task.update({
        where: { id: dispute.taskId, version: dispute.task.version },
        data: {
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
          version: { increment: 1 }
        }
      });

      // 3. Payout Escrow
      const price = Number(dispute.task.price);
      const platformFee = price * 0.10;
      
      const escrowEntry = await tx.escrowEntry.findUnique({ where: { taskId: dispute.taskId } });
      if (escrowEntry && (escrowEntry.status === "LOCKED" || escrowEntry.status === "DISPUTED")) {
        await releaseFundsTx(tx, {
          taskId: dispute.taskId,
          taskerWalletId: taskerWallet.id,
          platformFee,
          idempotencyKey: `dispute_payout_${dispute.id}`
        });
      }

      // 4. Audit Log
      await tx.adminLog.create({
        data: {
          adminId,
          action: "DISPUTE_PAYOUT",
          entityType: "DISPUTE",
          entityId: id,
          details: JSON.stringify({ taskId: dispute.taskId, amount: String(price - platformFee), taskerId: dispute.task.taskerId })
        }
      });

      return resolved;
    }, { maxWait: 15000, timeout: 15000 });

    try {
      await updateMetricsAndTrust(prisma, dispute.task.requesterId);
      if (dispute.task.taskerId) await updateMetricsAndTrust(prisma, dispute.task.taskerId);
    } catch (e) {}

    res.json({ dispute: updatedDispute });
  } catch (error: any) {
    if (error instanceof WalletError) return res.status(400).json({ error: error.message });
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

const partialReleaseSchema = z.object({
  requesterAmount: z.number().min(0),
  taskerAmount: z.number().min(0),
  resolution: z.string().optional()
});

router.post("/disputes/:id/partial-release", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;
    const { requesterAmount, taskerAmount, resolution } = partialReleaseSchema.parse(req.body);

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { task: true }
    });

    if (!dispute) return res.status(404).json({ error: "Dispute not found" });
    if (dispute.status === DisputeStatus.RESOLVED_REFUNDED || dispute.status === DisputeStatus.RESOLVED_RELEASED) {
      return res.status(400).json({ error: "Dispute already resolved" });
    }

    if (!dispute.task.taskerId) {
      return res.status(400).json({ error: "No tasker assigned" });
    }

    const taskerWallet = await prisma.wallet.findUnique({ where: { userId: dispute.task.taskerId } });
    if (!taskerWallet) return res.status(400).json({ error: "Tasker has no wallet" });

    const updatedDispute = await prisma.$transaction(async (tx) => {
      // 1. Mark dispute resolved
      const resolved = await tx.dispute.update({
        where: { id: dispute.id, version: dispute.version },
        data: {
          // Status could be considered RESOLVED_RELEASED since some money went out, or a new status.
          // Since partial release is closer to a split, we'll map to RESOLVED_RELEASED for trust hit on both or something,
          // or just RESOLVED_REFUNDED. Let's use RESOLVED_RELEASED.
          status: DisputeStatus.RESOLVED_RELEASED,
          resolution: resolution || "Partial release by admin",
          version: { increment: 1 }
        }
      });

      // 2. Complete Task (or cancel?) usually if partially done it's cancelled or completed. Let's mark COMPLETED to retain reviews.
      await tx.task.update({
        where: { id: dispute.taskId, version: dispute.task.version },
        data: {
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
          version: { increment: 1 }
        }
      });

      // 3. Partial Release
      const escrowEntry = await tx.escrowEntry.findUnique({ where: { taskId: dispute.taskId } });
      if (escrowEntry && (escrowEntry.status === "LOCKED" || escrowEntry.status === "DISPUTED")) {
        await partialReleaseFundsTx(tx, {
          taskId: dispute.taskId,
          taskerWalletId: taskerWallet.id,
          requesterAmount,
          taskerAmount,
          idempotencyKey: `dispute_partial_${dispute.id}`
        });
      }

      // 4. Audit Log
      await tx.adminLog.create({
        data: {
          adminId,
          action: "DISPUTE_PARTIAL_RELEASE",
          entityType: "DISPUTE",
          entityId: id,
          details: JSON.stringify({ taskId: dispute.taskId, requesterAmount, taskerAmount })
        }
      });

      return resolved;
    }, { maxWait: 15000, timeout: 15000 });

    try {
      await updateMetricsAndTrust(prisma, dispute.task.requesterId);
      if (dispute.task.taskerId) await updateMetricsAndTrust(prisma, dispute.task.taskerId);
    } catch (e) {}

    res.json({ dispute: updatedDispute });
  } catch (error: any) {
    if (error instanceof WalletError) return res.status(400).json({ error: error.message });
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error);
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

export default router;
