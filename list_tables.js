import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  try {
    const result = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table';`);
    console.log("Tables in DB:", result);
  } catch (err) {
    console.error("Error reading DB:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
