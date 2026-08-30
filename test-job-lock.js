import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  try {
    await prisma.jobLock.count();
    console.log("SUCCESS");
  } catch (e) {
    console.log("ERROR CODE:", e.code);
    console.log("ERROR MESSAGE:", e.message);
  }
}
run();
