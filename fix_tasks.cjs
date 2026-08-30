const fs = require('fs');
let code = fs.readFileSync('src/api/tasks.routes.ts', 'utf8');

// 1. Remove taskType validation checks
code = code.replace(/if\s*\(task\.taskType\s*===\s*"INSTITUTIONAL_PARENT"\)\s*return\s*res\.status\(400\)\.json\(\{ error:\s*"Institutional parent tasks cannot be executed directly\." \}\);\s*(console\.log\("404 Task not found"\);)?/g, '');
code = code.replace(/if\s*\(task\.taskType\s*===\s*"INSTITUTIONAL_PARENT"\)\s*return\s*res\.status\(400\)\.json\(\{ error:\s*"Institutional parent tasks cannot be executed directly\." \}\);/g, '');

// 2. Remove taskType from where clauses
code = code.replace(/taskType:\s*"HOUSEHOLD"/g, '');
code = code.replace(/taskType:\s*\{\s*not:\s*"INSTITUTIONAL_PARENT"\s*\},\s*/g, '');

// 3. Fix category filter
code = code.replace(/where\.category\s*=\s*category\s*as\s*string;/g, 'where.Service = { category: { name: category as string } };');
code = code.replace(/\{\s*category:\s*\{\s*contains:\s*String\(search\),\s*mode:\s*"insensitive"\s*\}\s*\}/g, '{ Service: { category: { name: { contains: String(search), mode: "insensitive" } } } }');

// 4. Remove category and isEmergency from create data (since they are invalid properties)
code = code.replace(/category:\s*data\.category,/g, '');
code = code.replace(/isEmergency:\s*data\.isEmergency\s*\|\|\s*false,/g, '');

// 5. Remove isEmergency validation
code = code.replace(/if\s*\(!task\.isEmergency\)\s*return\s*res\.status\(400\)\.json\(\{ error:\s*"Not an emergency task"\s*\}\);/g, '');

fs.writeFileSync('src/api/tasks.routes.ts', code);
console.log("Cleaned tasks.routes.ts");
