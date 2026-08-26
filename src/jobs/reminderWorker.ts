import { UserRole, TaskStatus, DisputeStatus, TransactionType, TransactionStatus, VerificationStatus, NotificationType, MessageType, OrganizationStatus, MembershipStatus, MembershipRole, ClaimStatus } from "../lib/enums.js";
import { PrismaClient } from "@prisma/client";

import { prisma } from "../lib/prisma.js";



export async function runReminderWorker() {
  console.log("[Job] Running Reminder Worker...");
  try {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const oneHourAndFifteenFromNow = new Date(now.getTime() + 75 * 60 * 1000);

    // 1. Task starts in 1 hour
    const upcomingTasks = await prisma.task.findMany({
      where: {
        status: TaskStatus.ACCEPTED,
        scheduledFor: {
          gte: oneHourFromNow,
          lte: oneHourAndFifteenFromNow
        }
        // Ideally we check if we already reminded, maybe a `remindedAt` flag, but for now we rely on the 15m window.
      }
    });

    for (const task of upcomingTasks) {
      await prisma.notification.create({
        data: {
          userId: task.taskerId!,
          type: "TASK_UPDATE",
          content: `Reminder: Your task "${task.title}" is scheduled to start in less than an hour.`,
          relatedEntityId: task.id
        }
      });
      await prisma.notification.create({
        data: {
          userId: task.requesterId,
          type: "TASK_UPDATE",
          content: `Reminder: Task "${task.title}" is scheduled to start in less than an hour.`,
          relatedEntityId: task.id
        }
      });
    }

    // 2. Approval pending
    const proofSubmittedTasks = await prisma.task.findMany({
      where: {
        status: TaskStatus.PROOF_SUBMITTED,
        updatedAt: { // We use updatedAt to see how long it's been
          lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Older than 24 hours
        }
      }
    });

    for (const task of proofSubmittedTasks) {
      // Create a warning for requester
      await prisma.notification.create({
        data: {
          userId: task.requesterId,
          type: "SYSTEM",
          content: `Action needed: Please review the proof for task "${task.title}".`,
          relatedEntityId: task.id
        }
      });
    }

    // 3. Auto-release warning (48 hours)
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const fiftyHoursAgo = new Date(now.getTime() - 50 * 60 * 60 * 1000); // 2 hour window
    const autoReleaseWarningTasks = await prisma.task.findMany({
      where: {
        status: TaskStatus.COMPLETED,
        completedAt: {
          gte: fiftyHoursAgo,
          lte: fortyEightHoursAgo
        },
        dispute: null
      },
      include: {
        escrowEntry: true
      }
    });

    for (const task of autoReleaseWarningTasks) {
      if (task.escrowEntry && task.escrowEntry.status === "LOCKED") {
        await prisma.notification.create({
            data: {
                userId: task.requesterId,
                type: "SYSTEM",
                content: `Warning: Escrow for task "${task.title}" will be automatically released to the tasker in 24 hours unless you dispute.`,
                relatedEntityId: task.id
            }
        });
      }
    }

  } catch (error) {
    console.error("[Job] Reminder worker error:", error?.message || error);
  }
}
