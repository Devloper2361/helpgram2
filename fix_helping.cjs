const fs = require('fs');
let content = fs.readFileSync('src/api/tasks.routes.ts', 'utf-8');

const target = `    const helpingTasks = await prisma.task.findMany({
      where: {
        OR: [`;

const replacement = `    const helpingTasks = await prisma.task.findMany({
      where: {
        taskType: { not: "INSTITUTIONAL_PARENT" },
        OR: [`;

content = content.replace(target, replacement);

fs.writeFileSync('src/api/tasks.routes.ts', content, 'utf-8');
console.log("Fixed helpingTasks query.");
