import fs from 'fs';
let content = fs.readFileSync('src/api/tasks.routes.ts', 'utf8');

const badBlock = `    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        requester: true,
        tasker: true,
        service: true,
        escrowEntry: {
          include: {
            transactions: {
              where: {
                status: "COMPLETED"
              }
            }
          }
        },
        platformRevenue: true
      }
    });

    if (!task) return res.status(404).json({ error: "Task not found" });`;

const goodBlock = `    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        requester: true,
        tasker: true,
        service: true,
        escrowEntry: {
          include: {
            transactions: {
              where: {
                status: "COMPLETED"
              }
            }
          }
        }
      }
    });

    if (!task) return res.status(404).json({ error: "Task not found" });
    const platformRevenueRecord = await prisma.platformRevenue.findUnique({ where: { taskId: id } });
    task.platformRevenue = platformRevenueRecord;`;

content = content.replace(badBlock, goodBlock);
fs.writeFileSync('src/api/tasks.routes.ts', content);
