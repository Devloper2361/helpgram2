import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.count();
  console.log("Users:", users);
  const allUsers = await prisma.user.findMany();
  console.log("User emails:", allUsers.map(u => u.email));
}
run();
