const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const counts = {
    User: await prisma.user.count(),
    Task: await prisma.task.count(),
    TaskApplication: await prisma.taskApplication.count(),
    Wallet: await prisma.wallet.count(),
    EscrowEntry: await prisma.escrowEntry.count(),
    Transaction: await prisma.transaction.count()
  };
  console.log("=== COUNTS ===");
  console.log(JSON.stringify(counts, null, 2));
}
run().finally(() => prisma.$disconnect());
