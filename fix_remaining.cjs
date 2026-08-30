const fs = require('fs');

// 1. institutional.routes.ts
let code = fs.readFileSync('src/api/institutional.routes.ts', 'utf8');
code = code.replace(/taskType:\s*"INSTITUTIONAL_SUB",/g, '');
code = code.replace(/if\s*\(subTask\.taskType\s*!==\s*"INSTITUTIONAL_SUB"\)\s*return\s*res\.status\(400\)\.json\(\{ error:\s*"Not an institutional subtask"\s*\}\);/g, '');
fs.writeFileSync('src/api/institutional.routes.ts', code);

// 2. dispatch.ts
let dispatch = fs.readFileSync('src/lib/dispatch.ts', 'utf8');
dispatch = dispatch.replace(/if\s*\(task\.taskType\s*===\s*"INSTITUTIONAL_PARENT"\)\s*\{\s*return;\s*\}/g, '');
fs.writeFileSync('src/lib/dispatch.ts', dispatch);

// 3. fairShare.ts
let fairShare = fs.readFileSync('src/lib/fairShare.ts', 'utf8');
fairShare = fairShare.replace(/if\s*\(task\s*&&\s*task\.taskType\s*===\s*"INSTITUTIONAL_PARENT"\)\s*return\s*\[\];/g, '');
fs.writeFileSync('src/lib/fairShare.ts', fairShare);

// 4. intelligence.routes.ts
let intel = fs.readFileSync('src/api/intelligence.routes.ts', 'utf8');
intel = intel.replace(/taskType:\s*\{\s*in:\s*\["INSTITUTIONAL_PARENT",\s*"INSTITUTIONAL_SUB"\]\s*\}/g, '');
intel = intel.replace(/taskType:\s*true/g, '');
intel = intel.replace(/\$\{t\.taskType\},/g, 'HOUSEHOLD,');
intel = intel.replace(/type:\s*t\.taskType,/g, 'type: "HOUSEHOLD",');
// Remove empty comma from where clause if any (e.g. `where: {  }`)
intel = intel.replace(/where:\s*\{\s*,\s*/g, 'where: { ');
fs.writeFileSync('src/api/intelligence.routes.ts', intel);

console.log("Cleaned remaining files");
