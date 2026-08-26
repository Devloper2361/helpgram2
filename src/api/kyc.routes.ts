import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "../lib/enums.js";
import { Router } from "express";
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

// GET /api/kyc/status
router.get("/status", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    let kyc = await prisma.kYCVerification.findUnique({ where: { userId } });
    if (!kyc) {
      kyc = await prisma.kYCVerification.create({
        data: { userId }
      });
    }
    res.json({ kyc });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/kyc/initiate
router.post("/initiate", authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.userId;
    let kyc = await prisma.kYCVerification.findUnique({ where: { userId } });
    
    if (kyc && kyc.status === "VERIFIED") {
      return res.status(400).json({ error: "Already verified" });
    }

    // In a real app we would call Persona/Jumio here
    const providerKey = `mock_kyc_${userId}_${Date.now()}`;
    
    const updated = await prisma.kYCVerification.upsert({
      where: { userId },
      create: {
        userId,
        status: VerificationStatus.PENDING,
        providerKey,
        submittedAt: new Date()
      },
      update: {
        status: VerificationStatus.PENDING,
        providerKey,
        submittedAt: new Date()
      }
    });

    res.json({ kyc: updated, sessionUrl: `/mock-kyc-flow?providerKey=${providerKey}` }); // Provide a mock session URL
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/kyc/webhook
router.post("/webhook", async (req: any, res: any) => {
  try {
    // Usually no auth here, verified by signature. For now simple.
    const { providerKey, status, notes } = req.body;
    
    if (!providerKey || !status) return res.status(400).json({ error: "Missing parameters" });

    const kyc = await prisma.kYCVerification.findUnique({ where: { providerKey } });
    if (!kyc) return res.status(404).json({ error: "KYC not found" });

    const newStatus = status === "approved" ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED;

    await prisma.kYCVerification.update({
      where: { id: kyc.id },
      data: {
        status: newStatus,
        notes: notes || (newStatus === VerificationStatus.VERIFIED ? "Approved via webhook" : "Rejected via webhook"),
        verifiedAt: newStatus === VerificationStatus.VERIFIED ? new Date() : null
      }
    });

    // Send notification
    await prisma.notification.create({
      data: {
        userId: kyc.userId,
        type: NotificationType.SYSTEM,
        content: newStatus === VerificationStatus.VERIFIED 
          ? "Your identity verification was approved. You can now apply to tasks as a Tasker." 
          : "Your identity verification was rejected. Please contact support.",
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
