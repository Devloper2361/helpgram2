const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findUnique({
    where: { email: 'worker15@helpgram.local' }
  });
  console.log("User role:", user.role);

  // Let's find an actual WORKER
  const worker = await prisma.user.findFirst({
    where: { role: 'WORKER' }
  });
  console.log("Found worker email:", worker.email);
}
run();
