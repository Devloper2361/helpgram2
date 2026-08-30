const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const completedTask = await prisma.task.findFirst({
    where: { status: 'COMPLETED' }
  });
  console.log("Invoice query test on task:", completedTask.id);

  try {
    const task = await prisma.task.findUnique({
      where: { id: completedTask.id },
      include: {
        requester: true,
        tasker: true,
        service: true,
        escrowEntry: {
          include: {
            transactions: {
              where: { status: "COMPLETED" }
            }
          }
        }
      }
    });
    console.log("Invoice task.service exists:", !!task.service);
  } catch (err) {
    console.log("Invoice error:", err.message);
  }
}
run();
