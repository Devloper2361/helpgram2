import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const users = await prisma.user.count();
  console.log("Users:", users);
  const user = await prisma.user.findUnique({ where: { email: 'worker15@helpgram.local' } });
  console.log("User:", !!user);
}
run();
