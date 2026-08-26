const fs = require('fs');
let content = fs.readFileSync('src/api/tasks.routes.ts', 'utf-8');

const guard = `\n    if (task.taskType === "INSTITUTIONAL_PARENT") return res.status(400).json({ error: "Institutional parent tasks cannot be executed directly." });`;

const searchStr = `if (!task) return res.status(404).json({ error: "Task not found" });`;
const searchStr2 = `if (!task) return res.status(404).json({ error: "Task not found" }); console.log("404 Task not found");`;

content = content.replace(new RegExp(searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), searchStr + guard);
content = content.replace(new RegExp(searchStr2.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), searchStr2 + guard);

fs.writeFileSync('src/api/tasks.routes.ts', content, 'utf-8');
console.log("Guards added.");
