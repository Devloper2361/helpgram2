const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ select: { email: true, role: true } });
  console.log(users.filter(u => u.role !== 'WORKER' && u.role !== 'CUSTOMER'));
  await prisma.$disconnect();
}
run();
