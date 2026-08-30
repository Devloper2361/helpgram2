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
      where: { id: walletId },
      data: {
        balanceAvailable: { increment: amount }
      }
    });

    // Create ledger entry
    const transaction = await tx.transaction.create({
      data: {
        walletId,
        amount,
        
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.COMPLETED,
        idempotencyKey
      }
    });

    return transaction;
  });
}

export async function withdrawFunds({
  walletId,
  amount,
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
      where: { id: walletId },
      data: {
        balanceAvailable: { decrement: amount }
      }
    });

    // Create ledger entry
    const transaction = await tx.transaction.create({
      data: {
        walletId,
        amount, // Stored as positive to follow ledger rules or negative depending on preference, but amount is positive.
        
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PROCESSING, // It might be processing via stripe or razorpay
        idempotencyKey
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
    where: { id: walletId },
    data: {
      balanceAvailable: { decrement: amount },
      balanceEscrowed: { increment: amount }
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
      status: EscrowStatus.LOCKED
      }
  });

  // Create transaction ledger
  const transaction = await tx.transaction.create({
    data: {
      walletId,
      taskId,
      escrowEntryId: escrowEntry.id,
      amount,
      
      type: TransactionType.ESCROW_LOCK,
      status: TransactionStatus.COMPLETED,
      idempotencyKey
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
    where: { id: requesterWallet.id },
    data: {
      balanceEscrowed: { decrement: releaseAmount }
    }
  });

  // Increment available funds for tasker
  const updatedTaskerWallet = await tx.wallet.update({
    where: { id: taskerWallet.id },
    data: {
      balanceAvailable: { increment: amountToTasker }
    }
  });

  // Update escrow entry status
  await tx.escrowEntry.update({
    where: { id: escrowEntry.id },
    data: {
      status: EscrowStatus.RELEASED
    }
  });

  // Create ledger entry for tasker
  const transaction = await tx.transaction.create({
    data: {
      walletId: taskerWallet.id,
      taskId,
      escrowEntryId: escrowEntry.id,
      amount: amountToTasker,
      
      type: TransactionType.ESCROW_RELEASE,
      status: TransactionStatus.COMPLETED,
      idempotencyKey
    }
  });

  if (platformFee > 0) {
    // Record platform revenue
    await tx.platformRevenue.create({
      data: {
        taskId,
        transactionId: transaction.id,
        amount: platformFee
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
    where: { id: requesterWallet.id },
    data: {
      balanceEscrowed: { decrement: refundAmount },
      balanceAvailable: { increment: refundAmount }
    }
  });

  await tx.escrowEntry.update({
    where: { id: escrowEntry.id },
    data: {
      status: EscrowStatus.REFUNDED
    }
  });

  const transaction = await tx.transaction.create({
    data: {
      walletId: requesterWallet.id,
      taskId,
      escrowEntryId: escrowEntry.id,
      amount: refundAmount,
      
      type: TransactionType.ESCROW_REFUND,
      status: TransactionStatus.COMPLETED,
      idempotencyKey
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
    where: { id: escrowEntry.id },
    data: {
      status: EscrowStatus.DISPUTED
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
    where: { id: requesterWallet.id },
    data: {
      balanceEscrowed: { decrement: escrowAmount },
      balanceAvailable: { increment: requesterAmount }
    }
  });

  // Increment tasker available
  const updatedTaskerWallet = await tx.wallet.update({
    where: { id: taskerWallet.id },
    data: {
      balanceAvailable: { increment: taskerAmount }
    }
  });

  await tx.escrowEntry.update({
    where: { id: escrowEntry.id },
    data: {
      status: EscrowStatus.PARTIAL_RELEASE
    }
  });

  const transaction = await tx.transaction.create({
    data: {
      walletId: taskerWallet.id, // For tasker, this is a release
      taskId,
      escrowEntryId: escrowEntry.id,
      amount: taskerAmount,
      
      type: TransactionType.ESCROW_RELEASE,
      status: TransactionStatus.COMPLETED,
      idempotencyKey
    }
  });

  // The requester also technically gets a refund transaction, we should create one for them as well
  await tx.transaction.create({
    data: {
      walletId: requesterWallet.id,
      taskId,
      escrowEntryId: escrowEntry.id,
      amount: requesterAmount,
      
      type: TransactionType.ESCROW_REFUND,
      status: TransactionStatus.COMPLETED,
      idempotencyKey: idempotencyKey + "_refund"
    }
  });

  return transaction;
}

export async function partialReleaseFunds(args: any) {
  return await prisma.$transaction((tx) => partialReleaseFundsTx(tx, args), { maxWait: 15000, timeout: 15000 });
}
