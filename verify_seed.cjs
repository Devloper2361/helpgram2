const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.findMany({ select: { email: true, role: true } });
  console.log("Total users:", users.length);
  const societyAdmins = users.filter(u => u.role === 'SOCIETY_ADMIN');
  const workers = users.filter(u => u.role === 'WORKER');
  console.log("Society Admins:", societyAdmins.map(u => u.email).join(', '));
  console.log("Workers:", workers.map(u => u.email).join(', '));
  await prisma.$disconnect();
}
run();
