import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus, EscrowStatus } from "./enums.js";
import { PrismaClient } from "@prisma/client";

import { prisma } from "../lib/prisma.js";



export class WalletError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletError";
  }
}

export async function depositFunds({
  walletId,
  amount,
  razorpayOrderId,
  idempotencyKey
}: {
  walletId: string;
  amount: number;
  razorpayOrderId?: string;
  idempotencyKey: string;
}) {
  if (amount <= 0) throw new WalletError("Amount must be greater than zero");

  return await prisma.$transaction(async (tx) => {
    // Idempotency check
    const existingTx = await tx.transaction.findUnique({
      where: { idempotencyKey }
    });
    if (existingTx) return existingTx;

    // Fetch wallet for OCC
    const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new WalletError("Wallet not found");

    // Atomic update with OCC
    const updatedWallet = await tx.wallet.update({
      where: { id: walletId, version: wallet.version },
      data: {
        balanceAvailable: { increment: amount },
        version: { increment: 1 }
      }
    });

    // Create ledger entry
    const transaction = await tx.transaction.create({
      data: {
        walletId,
        amount,
        balanceAfter: updatedWallet.balanceAvailable,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        razorpayOrderId,
        idempotencyKey,
        description: "Deposit funds"
      }
    });

    return transaction;
  });
}

export async function withdrawFunds({
  walletId,
  amount,
  razorpayPayoutId,
  idempotencyKey
}: {
  walletId: string;
  amount: number;
  razorpayPayoutId?: string;
  idempotencyKey: string;
}) {
  if (amount <= 0) throw new WalletError("Amount must be greater than zero");

  return await prisma.$transaction(async (tx) => {
    // Idempotency check
    const existingTx = await tx.transaction.findUnique({
      where: { idempotencyKey }
    });
    if (existingTx) return existingTx;

    const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) throw new WalletError("Wallet not found");

    if (Number(wallet.balanceAvailable) < amount) {
      throw new WalletError("Insufficient available balance");
    }

    // Atomic update with OCC
    const updatedWallet = await tx.wallet.update({
      where: { id: walletId, version: wallet.version },
      data: {
        balanceAvailable: { decrement: amount },
        version: { increment: 1 }
      }
    });

    // Create ledger entry
    const transaction = await tx.transaction.create({
      data: {
        walletId,
        amount, // Stored as positive to follow ledger rules or negative depending on preference, but amount is positive.
        balanceAfter: updatedWallet.balanceAvailable,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PROCESSING, // It might be processing via stripe or razorpay
        razorpayPayoutId,
        idempotencyKey,
        description: "Withdrawal request"
      }
    });

    return transaction;
  });
}

export async function lockFundsTx(
  tx: any,
  {
    walletId,
    taskId,
    amount,
    idempotencyKey
  }: {
    walletId: string;
    taskId: string;
    amount: number;
    idempotencyKey: string;
  }
) {
  const existingTx = await tx.transaction.findUnique({
    where: { idempotencyKey }
  });
  if (existingTx) return existingTx;

  const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
  if (!wallet) throw new WalletError("Wallet not found");

  if (Number(wallet.balanceAvailable) < amount) {
    throw new WalletError("Insufficient available balance to lock funds");
  }

  // Atomic wallet update
  const updatedWallet = await tx.wallet.update({
    where: { id: walletId, version: wallet.version },
    data: {
      balanceAvailable: { decrement: amount },
      balanceEscrowed: { increment: amount },
      version: { increment: 1 }
    }
  });

  const existingEscrow = await tx.escrowEntry.findUnique({
    where: { taskId }
  });

  if (existingEscrow) {
    throw new WalletError("Task already has an escrow entry");
  }

  const escrowEntry = await tx.escrowEntry.create({
    data: {
      taskId,
      amount,
      status: EscrowStatus.LOCKED,
      version: 1,
    }
  });

  // Create transaction ledger
  const transaction = await tx.transaction.create({
    data: {
      walletId,
      taskId,
      escrowEntryId: escrowEntry.id,
      amount,
      balanceAfter: updatedWallet.balanceAvailable,
      type: TransactionType.ESCROW_LOCK,
      status: TransactionStatus.COMPLETED,
      idempotencyKey,
      description: `Funds locked for task ${taskId}`
    }
  });

  return transaction;
}

export async function lockFunds(args: any) {
  if (args.amount <= 0) throw new WalletError("Amount must be greater than zero");
  return await prisma.$transaction((tx) => lockFundsTx(tx, args), { maxWait: 15000, timeout: 15000 });
}

export async function releaseFundsTx(
  tx: any,
  {
    taskId,
    taskerWalletId,
    platformFee,
    idempotencyKey
  }: {
    taskId: string;
    taskerWalletId: string;
    platformFee: number;
    idempotencyKey: string;
  }
) {
  const existingTx = await tx.transaction.findUnique({
    where: { idempotencyKey }
  });
  if (existingTx) return existingTx;

  const escrowEntry = await tx.escrowEntry.findUnique({
    where: { taskId },
    include: { task: true }
  });

  if (!escrowEntry) throw new WalletError("Escrow entry not found");
  if (escrowEntry.status === EscrowStatus.RELEASED) throw new WalletError("Escrow already released");
  if (escrowEntry.status === EscrowStatus.REFUNDED) throw new WalletError("Escrow already refunded");
  if (escrowEntry.status === EscrowStatus.PARTIAL_RELEASE) throw new WalletError("Escrow already partially released");

  const releaseAmount = Number(escrowEntry.amount);
  const amountToTasker = releaseAmount - platformFee;

  if (amountToTasker < 0) throw new WalletError("Platform fee exceeds escrow amount");

  // Fetch both wallets for OCC (Requester's and Tasker's)
  const requesterWallet = await tx.wallet.findUnique({ where: { userId: escrowEntry.task.requesterId } });
  if (!requesterWallet) throw new WalletError("Requester wallet not found");

  const taskerWallet = await tx.wallet.findUnique({ where: { id: taskerWalletId } });
  if (!taskerWallet) throw new WalletError("Tasker wallet not found");

  if (Number(requesterWallet.balanceEscrowed) < releaseAmount) {
     throw new WalletError("Requester escrow balance is insufficient");
  }

  // Decrement escrowed funds from requester
  await tx.wallet.update({
    where: { id: requesterWallet.id, version: requesterWallet.version },
    data: {
      balanceEscrowed: { decrement: releaseAmount },
      version: { increment: 1 }
    }
  });

  // Increment available funds for tasker
  const updatedTaskerWallet = await tx.wallet.update({
    where: { id: taskerWallet.id, version: taskerWallet.version },
    data: {
      balanceAvailable: { increment: amountToTasker },
      version: { increment: 1 }
    }
  });

  // Update escrow entry status
  await tx.escrowEntry.update({
    where: { id: escrowEntry.id, version: escrowEntry.version },
    data: {
      status: EscrowStatus.RELEASED,
      version: { increment: 1 }
    }
  });

  // Create ledger entry for tasker
  const transaction = await tx.transaction.create({
    data: {
      walletId: taskerWallet.id,
      taskId,
      escrowEntryId: escrowEntry.id,
      amount: amountToTasker,
      balanceAfter: updatedTaskerWallet.balanceAvailable,
      type: TransactionType.ESCROW_RELEASE,
      status: TransactionStatus.COMPLETED,
      idempotencyKey,
      description: `Funds released for task ${taskId}`
    }
  });

  if (platformFee > 0) {
    // Record platform revenue
    await tx.platformRevenue.create({
      data: {
        taskId,
        transactionId: transaction.id,
        amount: platformFee,
        description: `Platform fee for task ${taskId}`
      }
    });
  }

  return transaction;
}

export async function releaseFunds(args: any) {
  return await prisma.$transaction((tx) => releaseFundsTx(tx, args), { maxWait: 15000, timeout: 15000 });
}

export async function refundFundsTx(
  tx: any,
  {
    taskId,
    idempotencyKey
  }: {
    taskId: string;
    idempotencyKey: string;
  }
) {
  const existingTx = await tx.transaction.findUnique({
    where: { idempotencyKey }
  });
  if (existingTx) return existingTx;

  const escrowEntry = await tx.escrowEntry.findUnique({
    where: { taskId },
    include: { task: true }
  });

  if (!escrowEntry) throw new WalletError("Escrow entry not found");
  if (escrowEntry.status === EscrowStatus.RELEASED) throw new WalletError("Escrow already released");
  if (escrowEntry.status === EscrowStatus.REFUNDED) throw new WalletError("Escrow already refunded");
  if (escrowEntry.status === EscrowStatus.PARTIAL_RELEASE) throw new WalletError("Escrow already partially released");

  const refundAmount = Number(escrowEntry.amount);

  const requesterWallet = await tx.wallet.findUnique({ where: { userId: escrowEntry.task.requesterId } });
  if (!requesterWallet) throw new WalletError("Requester wallet not found");

  if (Number(requesterWallet.balanceEscrowed) < refundAmount) {
     throw new WalletError("Requester escrow balance is insufficient");
  }

  // Move escrow back to available
  const updatedWallet = await tx.wallet.update({
    where: { id: requesterWallet.id, version: requesterWallet.version },
    data: {
      balanceEscrowed: { decrement: refundAmount },
      balanceAvailable: { increment: refundAmount },
      version: { increment: 1 }
    }
  });

  await tx.escrowEntry.update({
    where: { id: escrowEntry.id, version: escrowEntry.version },
    data: {
      status: EscrowStatus.REFUNDED,
      version: { increment: 1 }
    }
  });

  const transaction = await tx.transaction.create({
    data: {
      walletId: requesterWallet.id,
      taskId,
      escrowEntryId: escrowEntry.id,
      amount: refundAmount,
      balanceAfter: updatedWallet.balanceAvailable,
      type: TransactionType.ESCROW_REFUND,
      status: TransactionStatus.COMPLETED,
      idempotencyKey,
      description: `Funds refunded for task ${taskId}`
    }
  });

  return transaction;
}

export async function refundFunds(args: any) {
  return await prisma.$transaction((tx) => refundFundsTx(tx, args), { maxWait: 15000, timeout: 15000 });
}

export async function freezeEscrowTx(
  tx: any,
  {
    taskId,
    idempotencyKey
  }: {
    taskId: string;
    idempotencyKey: string;
  }
) {
  const escrowEntry = await tx.escrowEntry.findUnique({
    where: { taskId }
  });

  if (!escrowEntry) throw new WalletError("Escrow entry not found");
  if (escrowEntry.status !== EscrowStatus.LOCKED) {
    throw new WalletError(`Escrow cannot be frozen from status: ${escrowEntry.status}`);
  }

  await tx.escrowEntry.update({
    where: { id: escrowEntry.id, version: escrowEntry.version },
    data: {
      status: EscrowStatus.DISPUTED,
      version: { increment: 1 }
    }
  });

  return escrowEntry;
}

export async function partialReleaseFundsTx(
  tx: any,
  {
    taskId,
    taskerWalletId,
    requesterAmount,
    taskerAmount,
    idempotencyKey
  }: {
    taskId: string;
    taskerWalletId: string;
    requesterAmount: number;
    taskerAmount: number;
    idempotencyKey: string;
  }
) {
  const existingTx = await tx.transaction.findUnique({
    where: { idempotencyKey }
  });
  if (existingTx) return existingTx;

  const escrowEntry = await tx.escrowEntry.findUnique({
    where: { taskId },
    include: { task: true }
  });

  if (!escrowEntry) throw new WalletError("Escrow entry not found");
  if (escrowEntry.status !== EscrowStatus.DISPUTED && escrowEntry.status !== EscrowStatus.LOCKED) {
    throw new WalletError("Escrow cannot be partially released from current status");
  }

  const escrowAmount = Number(escrowEntry.amount);
  const totalRelease = requesterAmount + taskerAmount;
  
  // Floating point safe comparison
  if (Math.abs(escrowAmount - totalRelease) > 0.0001) {
    throw new WalletError("Partial release amounts do not sum to total escrow amount");
  }

  const requesterWallet = await tx.wallet.findUnique({ where: { userId: escrowEntry.task.requesterId } });
  if (!requesterWallet) throw new WalletError("Requester wallet not found");

  const taskerWallet = await tx.wallet.findUnique({ where: { id: taskerWalletId } });
  if (!taskerWallet) throw new WalletError("Tasker wallet not found");

  if (Number(requesterWallet.balanceEscrowed) < escrowAmount) {
     throw new WalletError("Requester escrow balance is insufficient");
  }

  // Decrement total escrow from requester
  const updatedRequesterWallet = await tx.wallet.update({
    where: { id: requesterWallet.id, version: requesterWallet.version },
    data: {
      balanceEscrowed: { decrement: escrowAmount },
      balanceAvailable: { increment: requesterAmount },
      version: { increment: 1 }
    }
  });

  // Increment tasker available
  const updatedTaskerWallet = await tx.wallet.update({
    where: { id: taskerWallet.id, version: taskerWallet.version },
    data: {
      balanceAvailable: { increment: taskerAmount },
      version: { increment: 1 }
    }
  });

  await tx.escrowEntry.update({
    where: { id: escrowEntry.id, version: escrowEntry.version },
    data: {
      status: EscrowStatus.PARTIAL_RELEASE,
      version: { increment: 1 }
    }
  });

  const transaction = await tx.transaction.create({
    data: {
      walletId: taskerWallet.id, // For tasker, this is a release
      taskId,
      escrowEntryId: escrowEntry.id,
      amount: taskerAmount,
      balanceAfter: updatedTaskerWallet.balanceAvailable,
      type: TransactionType.ESCROW_RELEASE,
      status: TransactionStatus.COMPLETED,
      idempotencyKey,
      description: `Partial funds released for task ${taskId}`
    }
  });

  // The requester also technically gets a refund transaction, we should create one for them as well
  await tx.transaction.create({
    data: {
      walletId: requesterWallet.id,
      taskId,
      escrowEntryId: escrowEntry.id,
      amount: requesterAmount,
      balanceAfter: updatedRequesterWallet.balanceAvailable,
      type: TransactionType.ESCROW_REFUND,
      status: TransactionStatus.COMPLETED,
      idempotencyKey: `${idempotencyKey}_refund`,
      description: `Partial funds refunded for task ${taskId}`
    }
  });

  return transaction;
}

export async function partialReleaseFunds(args: any) {
  return await prisma.$transaction((tx) => partialReleaseFundsTx(tx, args), { maxWait: 15000, timeout: 15000 });
}
