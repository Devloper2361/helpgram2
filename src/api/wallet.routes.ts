import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "../lib/enums.js";
import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

import jwt from "jsonwebtoken";
import { WalletError } from "../lib/wallet.js";
import { v4 as uuidv4 } from "uuid";
import { withdrawLimiter } from "./middleware/rate-limit.js";
import Razorpay from "razorpay";
import { prisma } from "../lib/prisma.js";

const router = Router();

const getJwtSecret = () => process.env.JWT_SECRET as string;
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
}) : null;

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

const setupWallet = async (userId: string) => {
  let wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await prisma.wallet.create({ data: { userId } });
  }
  return wallet;
};

// GET /api/wallet
router.get("/", authenticate, async (req: any, res: any) => {
  try {
    const wallet = await setupWallet(req.user.userId);
    res.json({ wallet });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/wallet/transactions
router.get("/transactions", authenticate, async (req: any, res: any) => {
  try {
    const wallet = await setupWallet(req.user.userId);
    
    const { page = "1", limit = "20" } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;
    
    const transactions = await prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limitNum
    });

    const total = await prisma.transaction.count({ where: { walletId: wallet.id } });

    res.json({ transactions, total, page: pageNum, limit: limitNum });
  } catch (error: any) {
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/wallet/payout-methods
router.get("/payout-methods", authenticate, async (req: any, res: any) => {
  try {
    const methods = await prisma.payoutMethod.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: "desc" }
    });
    res.json({ payoutMethods: methods });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const payoutMethodSchema = z.object({
  type: z.enum(["UPI", "BANK"]),
  upiId: z.string().optional(),
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
});

// POST /api/wallet/payout-methods
router.post("/payout-methods", authenticate, async (req: any, res: any) => {
  try {
    const data = payoutMethodSchema.parse(req.body);
    if (data.type === "UPI" && !data.upiId) return res.status(400).json({ error: "upiId required for UPI" });
    if (data.type === "BANK" && (!data.accountHolderName || !data.accountNumber || !data.ifscCode)) {
       return res.status(400).json({ error: "Bank details required for BANK" });
    }

    // Unset current default if any
    await prisma.payoutMethod.updateMany({
      where: { userId: req.user.userId, isDefault: true },
      data: { isDefault: false }
    });

    const method = await prisma.payoutMethod.create({
      data: {
        userId: req.user.userId,
        type: data.type,
        upiId: data.upiId,
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        isDefault: true
      }
    });

    res.json({ payoutMethod: method });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/wallet/payout-methods/:id/default
router.post("/payout-methods/:id/default", authenticate, async (req: any, res: any) => {
  try {
    const methodId = req.params.id;
    const method = await prisma.payoutMethod.findUnique({ where: { id: methodId } });
    if (!method || method.userId !== req.user.userId) {
      return res.status(404).json({ error: "Payout method not found" });
    }

    await prisma.$transaction([
      prisma.payoutMethod.updateMany({
        where: { userId: req.user.userId, isDefault: true },
        data: { isDefault: false }
      }),
      prisma.payoutMethod.update({
        where: { id: methodId },
        data: { isDefault: true }
      })
    ]);

    res.json({ message: "Default payout method updated" });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/wallet/payout-methods/:id
router.delete("/payout-methods/:id", authenticate, async (req: any, res: any) => {
  try {
    const methodId = req.params.id;
    const method = await prisma.payoutMethod.findUnique({ where: { id: methodId } });
    if (!method || method.userId !== req.user.userId) {
      return res.status(404).json({ error: "Payout method not found" });
    }

    await prisma.payoutMethod.delete({
      where: { id: methodId }
    });

    res.json({ message: "Payout method deleted" });
  } catch (error: any) {
    res.status(500).json({ error: "Internal server error" });
  }
});

const amountSchema = z.object({
  amount: z.number().positive(),
  idempotencyKey: z.string().optional()
});

// POST /api/wallet/deposit
router.post("/deposit", authenticate, async (req: any, res: any) => {
  try {
    const { amount, idempotencyKey } = amountSchema.parse(req.body);
    const wallet = await setupWallet(req.user.userId);
    if (!idempotencyKey) return res.status(400).json({ error: "idempotencyKey is required" });
    const key = idempotencyKey;

    if (!razorpay) {
      return res.status(500).json({ error: "Razorpay not configured" });
    }

    const transaction = await prisma.transaction.create({
       data: {
         id: uuidv4(),
         walletId: wallet.id,
         amount,
         type: TransactionType.DEPOSIT,
         status: TransactionStatus.PENDING,
         idempotencyKey: key,
       }
    });

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // amount in paise
      currency: "INR",
      receipt: transaction.id,
    });

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { razorpayOrderId: order.id }
    });

    res.status(200).json({ 
      orderId: order.id, 
      amount: order.amount, 
      currency: order.currency, 
      key_id: process.env.RAZORPAY_KEY_ID,
      message: "Razorpay order created" 
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const withdrawSchema = z.object({
  amount: z.number().positive(),
  payoutMethodId: z.string().uuid(),
  idempotencyKey: z.string().optional()
});

// POST /api/wallet/withdraw
router.post("/withdraw", authenticate, withdrawLimiter, async (req: any, res: any) => {
  try {
    const { amount, payoutMethodId, idempotencyKey } = withdrawSchema.parse(req.body);
    const wallet = await setupWallet(req.user.userId);
    
    const payoutMethod = await prisma.payoutMethod.findUnique({ where: { id: payoutMethodId } });
    if (!payoutMethod || payoutMethod.userId !== req.user.userId) {
      return res.status(400).json({ error: "Invalid payout method" });
    }

    if (Number(wallet.balanceAvailable) < amount) {
       return res.status(400).json({ error: "Insufficient available balance" });
    }

    if (!razorpay) {
      return res.status(500).json({ error: "Razorpay not configured" });
    }

    if (!idempotencyKey) return res.status(400).json({ error: "idempotencyKey is required" });
    const key = idempotencyKey;

    // Deduct immediately, mark PROCESSING
    const transaction = await prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id, version: wallet.version },
        data: { 
          balanceAvailable: { decrement: amount },
          version: { increment: 1 } 
        }
      });
      
      return tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: TransactionType.WITHDRAWAL,
          status: TransactionStatus.PROCESSING,
          idempotencyKey: key,
        }
      });
    });

    // In a real RazorpayX integration, we would create a fund account and payout here
    // We will mock the payout API call for now, but save the intended payout ID
    
    // const payout = await razorpay.payouts.create({ ... })
    const mockPayoutId = "pout_" + Date.now();

    // Save payout id
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { razorpayPayoutId: mockPayoutId }
    });

    res.status(200).json({ transaction, message: "Withdrawal processing" });
  } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.flatten() });
    
    if (error.code === "P2025") {
      return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    }
    
    if (error.code === "P2025") return res.status(409).json({ error: "Conflict: The record was updated or deleted by another process." });
    console.error(error?.message || error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
