import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "../lib/enums.js";
import { Router } from "express";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

import express from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET as string;

// The webhook needs the raw body, so we expect this router to be mounted BEFORE express.json()
router.post("/razorpay", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["x-razorpay-signature"];

  if (!razorpayWebhookSecret) {
    console.error("Razorpay webhook secret not configured.");
    return res.status(400).send("Razorpay missing");
  }

  const expectedSignature = crypto.createHmac('sha256', razorpayWebhookSecret)
                                  .update(req.body)
                                  .digest('hex');

  if (expectedSignature !== sig) {
    console.log(`⚠️  Webhook signature verification failed.`);
    return res.status(400).send(`Webhook Error: Invalid Signature`);
  }

  let event;
  try {
    event = JSON.parse(req.body.toString());
  } catch (err) {
    return res.status(400).send(`Webhook Error: Invalid Body`);
  }

  try {
    if (event.event === "order.paid") {
       const order = event.payload.order.entity;
       // The receipt field contains our transaction ID
       const txId = order.receipt;
       if (txId) {
         await handleSuccessfulDeposit(txId, order.id);
       }
    } else if (event.event === "payout.processed") {
       const payout = event.payload.payout.entity;
       const payoutId = payout.id;
       await handleSuccessfulWithdrawalByPayoutId(payoutId);
    }
  } catch (err: any) {
    console.log("Webhook handler failed:", err);
  }

  res.json({ status: "ok" });
});

async function handleSuccessfulWithdrawalByPayoutId(payoutId: string) {
  await prisma.$transaction(async (tx) => {
    const { count } = await tx.transaction.updateMany({
      where: { razorpayPayoutId: payoutId, status: TransactionStatus.PROCESSING },
      data: { status: TransactionStatus.COMPLETED }
    });
  });
}

async function handleSuccessfulDeposit(txId: string, orderId: string) {
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({ where: { id: txId } });
    if (!transaction) return;

    const { count } = await tx.transaction.updateMany({
      where: { id: txId, status: TransactionStatus.PENDING },
      data: { status: TransactionStatus.COMPLETED, razorpayOrderId: orderId }
    });

    if (count === 0) return; // already processed

    const wallet = await tx.wallet.findUnique({ where: { id: transaction.walletId } });
    if (!wallet) throw new Error("Wallet not found");

    await tx.wallet.update({
      where: { id: wallet.id, version: wallet.version },
      data: { 
        balanceAvailable: { increment: transaction.amount },
        version: { increment: 1 }
      }
    });
  });
}

export default router;
