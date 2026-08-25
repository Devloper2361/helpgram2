import { runAutoRelease } from "./autoReleaseWorker.js";
import { runReminderWorker } from "./reminderWorker.js";
import { runCleanupWorker } from "./cleanupWorker.js";
import { PrismaClient } from "@prisma/client";

import { prisma } from "../lib/prisma.js";



// Poll intervals
const ONE_HOUR = 60 * 60 * 1000;
const FIFTEEN_MINS = 15 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

async function executeWithLock(jobName: string, workerFn: () => Promise<void>) {
  try {
    const now = new Date();
    // Attempt to acquire lock atomically
    try {
      await prisma.jobLock.create({
        data: { id: jobName, lockedAt: now }
      });
    } catch (e: any) {
      if (e.code === "P2002") {
        // Evaluate if lock is expired (older than 10 mins)
        const lock = await prisma.jobLock.findUnique({ where: { id: jobName } });
        if (!lock) {
           return;
        }
        if (now.getTime() - lock.lockedAt.getTime() < 10 * 60 * 1000) {
          console.log(`[JobLock] Job ${jobName} is already running.`);
          return;
        } else {
          // Atomic conditional update to safely take over expired lock
          const updated = await prisma.jobLock.updateMany({
            where: { 
              id: jobName,
              lockedAt: lock.lockedAt // match exact time to prevent race 
            },
            data: { lockedAt: now }
          });
          if (updated.count === 0) {
             console.log(`[JobLock] Expired lock ${jobName} taken by another node.`);
             return; // lost the race
          }
        }
      } else {
        throw e;
      }
    }

    try {
      await workerFn();
    } finally {
      await prisma.jobLock.delete({ where: { id: jobName } });
    }
  } catch (error) {
    console.error(`[JobLock] Error running ${jobName}:`, error);
  }
}

export function startBackgroundJobs() {
  console.log("Starting background jobs...");
  
  setTimeout(() => {
    executeWithLock("autoRelease", runAutoRelease);
    executeWithLock("reminder", runReminderWorker);
    executeWithLock("cleanup", runCleanupWorker);
  }, 5000);

  setInterval(() => executeWithLock("autoRelease", runAutoRelease), ONE_HOUR);
  setInterval(() => executeWithLock("reminder", runReminderWorker), FIFTEEN_MINS);
  setInterval(() => executeWithLock("cleanup", runCleanupWorker), ONE_DAY);
}

