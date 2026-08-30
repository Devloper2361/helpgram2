const fs = require('fs');
let code = fs.readFileSync('src/api/institutional.routes.ts', 'utf8');

// 1. Remove taskType validation checks
code = code.replace(/if\s*\(parentTask\.taskType\s*!==\s*"INSTITUTIONAL_PARENT"\)\s*return\s*res\.status\(400\)\.json\(\{ error:\s*"Not an institutional parent task"\s*\}\);/g, '');

// 2. Remove taskType and subTasks from where clauses
code = code.replace(/taskType:\s*"INSTITUTIONAL_PARENT"/g, '');
code = code.replace(/subTasks:\s*true/g, '');
code = code.replace(/,\s*subTasks:\s*true\s*/g, '');

// Remove the include: {} block if it becomes empty
code = code.replace(/include:\s*\{\s*\}/g, '');

// 3. Subtasks iteration
// In institutional.routes.ts, it might do something with parentTask.subTasks.
// We'll let it be empty array if undefined. 
code = code.replace(/parentTask\.subTasks/g, '(parentTask.subTasks || [])');

// 4. parentTaskId
// It queries subtasks using parentTaskId.
code = code.replace(/parentTaskId:\s*taskId/g, '');

fs.writeFileSync('src/api/institutional.routes.ts', code);
console.log("Cleaned institutional.routes.ts");
