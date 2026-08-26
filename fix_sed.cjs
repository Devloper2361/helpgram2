const fs = require('fs');
let content = fs.readFileSync('src/api/tasks.routes.ts', 'utf-8');

// The bad replacements were either:
// `taskType: { not: "INSTITUTIONAL_PARENT" }, `
// or
// `\n        taskType: { not: "INSTITUTIONAL_PARENT" },`

content = content.replace(/taskType: \{ not: "INSTITUTIONAL_PARENT" \}, /g, '');
content = content.replace(/\n        taskType: \{ not: "INSTITUTIONAL_PARENT" \},/g, '');

fs.writeFileSync('src/api/tasks.routes.ts', content, 'utf-8');
console.log("Reverted bad sed replacements.");
