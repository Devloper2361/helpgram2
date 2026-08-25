import fs from 'fs';
let content = fs.readFileSync('src/api/tasks.routes.ts', 'utf8');

// The incorrect block we injected:
const badBlock = `let whereClause: any = { taskId: id };
    if (task.requesterId !== userId) {
      whereClause.taskerId = userId;
    }`;

const goodBlock = `if (task.requesterId !== userId) return res.status(403).json({ error: "Unauthorized" });`;

// We want to restore all except the one in /:id/applications
// Actually, let's restore ALL, then only modify /:id/applications correctly

content = content.replaceAll(badBlock, goodBlock);

fs.writeFileSync('src/api/tasks.routes.ts', content);
