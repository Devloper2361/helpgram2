import { PrismaClient } from "@prisma/client";

import { prisma } from "../lib/prisma.js";



export async function runCleanupWorker() {
  console.log("[Job] Running Cleanup Worker...");
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Delete read notifications older than 30 days
    const deletedCount = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        createdAt: { lte: thirtyDaysAgo }
      }
    });
    
    console.log(`[Job] Deleted ${deletedCount.count} old notifications.`);

  } catch (error) {
    console.error("[Job] Cleanup worker error:", error);
  }
}
