import fs from 'fs';
let content = fs.readFileSync('src/api/admin.routes.ts', 'utf8');
content = content.replace(/details: { taskId: dispute.taskId }/, "details: JSON.stringify({ taskId: dispute.taskId })");
content = content.replace(/details: { taskId: dispute.taskId, amount: String\(price - platformFee\), taskerId: dispute.task.taskerId }/, "details: JSON.stringify({ taskId: dispute.taskId, amount: String(price - platformFee), taskerId: dispute.task.taskerId })");
content = content.replace(/details: { taskId: dispute.taskId, requesterAmount, taskerAmount }/, "details: JSON.stringify({ taskId: dispute.taskId, requesterAmount, taskerAmount })");
fs.writeFileSync('src/api/admin.routes.ts', content);
