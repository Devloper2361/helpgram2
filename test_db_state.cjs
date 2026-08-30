const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  // Check users count
  const userCount = await prisma.user.count();
  const taskCount = await prisma.task.count();
  console.log(`DB Status: ${userCount} users, ${taskCount} tasks.`);

  // Find an open task
  const openTask = await prisma.task.findFirst({
    where: { status: 'OPEN' }
  });

  if (!openTask) {
    console.log("No OPEN tasks found");
    return;
  }
  console.log(`Found OPEN task: ${openTask.id}`);

  // Test the relation exactly as requested
  const taskWithService = await prisma.task.findUnique({
    where: { id: openTask.id },
    include: {
      service: {
        include: {
          category: true,
          skills: true
        }
      }
    }
  });

  console.log("task.service is available:", !!taskWithService.service);
  if (taskWithService.service) {
    console.log("service.category is available:", !!taskWithService.service.category);
    console.log("service.skills is available:", !!taskWithService.service.skills);
  }
  
  await prisma.$disconnect();
}
run();
