const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const task = await prisma.task.findFirst({
    where: { status: 'OPEN' },
    include: {
      service: {
        include: {
          category: true,
          skills: true
        }
      }
    }
  });
  console.log("task.service is available:", !!task.service);
  console.log("service.category is available:", !!task.service.category);
  console.log("service.skills is available:", !!task.service.skills);
}
run();
