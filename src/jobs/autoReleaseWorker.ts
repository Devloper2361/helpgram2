import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "../lib/enums.js";
import { PrismaClient } from "@prisma/client";

import { releaseFundsTx } from "../lib/wallet.js";
import { updateMetricsAndTrust } from "../lib/trust.js";
import { prisma } from "../lib/prisma.js";



export async function runAutoRelease() {
  console.log("[Job] Running Auto Release Worker...");
  try {
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const tasksToRelease = await prisma.task.findMany({
      where: {
        status: TaskStatus.COMPLETED,
        completedAt: { lte: seventyTwoHoursAgo },
        dispute: null // No dispute exists
      },
      include: {
        escrowEntry: true
      }
    });

    for (const task of tasksToRelease) {
      if (task.escrowEntry && task.escrowEntry.status === "LOCKED") {
        console.log(`[Job] Auto-releasing funds for task ${task.id}`);
        try {
          const taskerWallet = await prisma.wallet.findUnique({ where: { userId: task.taskerId! } });
          if (!taskerWallet) continue;

          await prisma.$transaction(async (tx) => {
            const price = Number(task.price);
            const platformFee = price * 0.10;
            
            await releaseFundsTx(tx, {
              taskId: task.id,
              taskerWalletId: taskerWallet.id,
              platformFee,
              idempotencyKey: `auto_release_${task.id}_${Date.now()}`
            });
            
            // Mark task as fully closed/archived if needed? No, leave it as completed.
          });
          
          await prisma.notification.create({
            data: {
              userId: task.requesterId,
              type: "SYSTEM",
              content: `Escrow for task "${task.title}" was automatically released after 72 hours.`,
              relatedEntityId: task.id
            }
          });
          
          await prisma.notification.create({
            data: {
              userId: task.taskerId!,
              type: "FUNDS_UPDATE",
              content: `Funds for task "${task.title}" have been released to your available balance.`,
              relatedEntityId: task.id
            }
          });
          
          console.log(`[Job] Auto-released funds for task ${task.id} successfully.`);
        } catch (err: any) {
             console.error(`[Job] Failed auto-release for task ${task.id}:`, err?.message);
        }
      }
    }
  } catch (error) {
    console.error("[Job] Auto release worker error:", error?.message || error);
  }
}
