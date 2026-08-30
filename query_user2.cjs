const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./prisma/dev.db'
    }
  }
});
async function run() {
  const users = await prisma.user.count();
  console.log("Users in prisma/dev.db:", users);
  const worker15 = await prisma.user.findUnique({ where: { email: 'worker15@helpgram.local' } });
  console.log("Worker15:", !!worker15);
  if (worker15) {
     console.log("Status:", worker15.status);
     console.log("Role:", worker15.role);
     console.log("Hash Prefix:", worker15.passwordHash ? worker15.passwordHash.substring(0, 10) : "NO HASH");
  }
}
run();
