import fs from 'fs';
let content = fs.readFileSync('src/api/tasks.routes.ts', 'utf8');

const target = `router.get("/:id/applications", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (task.requesterId !== userId) return res.status(403).json({ error: "Unauthorized" });

    const applications = await prisma.taskApplication.findMany({
      where: whereClause,`;

const replacement = `router.get("/:id/applications", authenticate, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: "Task not found" });
    
    let whereClause: any = { taskId: id };
    if (task.requesterId !== userId) {
      whereClause.taskerId = userId;
    }

    const applications = await prisma.taskApplication.findMany({
      where: whereClause,`;

content = content.replace(target, replacement);
fs.writeFileSync('src/api/tasks.routes.ts', content);
