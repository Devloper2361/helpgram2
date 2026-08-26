import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const router = Router();

const getJwtSecret = () => process.env.JWT_SECRET as string;

const authenticate = (req: any, res: any, next: any) => {
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { userId: string, role: string };
    req.user = decoded;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const evidenceSchema = z.object({
  url: z.string().url(),
  fileType: z.string()
});

router.post("/:id/evidence", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { url, fileType } = evidenceSchema.parse(req.body);

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { task: true }
    });

    if (!dispute) return res.status(404).json({ error: "Dispute not found" });

    if (dispute.status === "RESOLVED_REFUND" || dispute.status === "RESOLVED_PAYOUT") {
      return res.status(400).json({ error: "Cannot upload evidence to a resolved dispute." });
    }

    if (dispute.task.requesterId !== userId && dispute.task.taskerId !== userId) {
      return res.status(403).json({ error: "Unauthorized. Only participants can upload evidence." });
    }

    const media = await prisma.mediaAttachment.create({
      data: {
        taskId: dispute.taskId,
        url,
        fileType,
        uploadedBy: userId
      }
    });

    res.status(201).json({ media });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            escrowEntry: true,
            media: true,
            requester: {
              select: { id: true, email: true, profile: { select: { fullName: true, trustScore: true, avatarUrl: true } } },
            },
            tasker: {
              select: { id: true, email: true, profile: { select: { fullName: true, trustScore: true, avatarUrl: true } } },
            }
          }
        },
        raisedBy: {
          select: { id: true, email: true, profile: { select: { fullName: true } } }
        }
      }
    });

    if (!dispute) return res.status(404).json({ error: "Dispute not found" });

    if (dispute.task.requesterId !== userId && dispute.task.taskerId !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json({ dispute });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
