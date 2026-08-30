import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const user = await prisma.user.findUnique({ where: { email: 'worker15@helpgram.local' } });
  console.log("User:", !!user);
  if (user) {
    console.log("Status:", user.status);
    console.log("Role:", user.role);
    console.log("Hash Prefix:", user.passwordHash ? user.passwordHash.substring(0, 10) : "NO HASH");
  } else {
    const totalUsers = await prisma.user.count();
    console.log("Total Users in DB:", totalUsers);
  }
}
run();
