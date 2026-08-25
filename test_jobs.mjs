import { PrismaClient } from "@prisma/client";
import { runAutoRelease } from "./src/jobs/autoReleaseWorker.js";
import { runReminderWorker } from "./src/jobs/reminderWorker.js";
import { runCleanupWorker } from "./src/jobs/cleanupWorker.js";

const prisma = new PrismaClient();

async function main() {
  console.log("-> Running reminder worker...");
  await runReminderWorker();
  
  console.log("-> Running auto release worker...");
  await runAutoRelease();
  
  console.log("-> Running cleanup worker...");
  await runCleanupWorker();
  
  console.log("-> Verification:");
  const notifs = await prisma.notification.findMany();
  console.log(`Notifications created: ${notifs.length}`);
  
  process.exit(0);
}

main().catch(console.error);
