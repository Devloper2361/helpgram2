const fs = require('fs');
let code = fs.readFileSync('audit_e2e.ts', 'utf8');
code = code.replace("description: 'Help!',", "description: 'Help needed right now!',");
fs.writeFileSync('audit_e2e.ts', code);
