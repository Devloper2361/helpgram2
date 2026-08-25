import fs from 'fs';
let content = fs.readFileSync('src/pages/TaskDetail.tsx', 'utf8');

// The incorrect block we injected:
const badBlock = `if (res.ok) fetchTask(); else { res.json().then(d => alert(d.error)).catch(() => alert("Failed to select helper")); }`;

const goodBlock = `if (res.ok) fetchTask();`;

// We want to restore all except the one in handleSelectHelper
content = content.replaceAll(badBlock, goodBlock);

fs.writeFileSync('src/pages/TaskDetail.tsx', content);
