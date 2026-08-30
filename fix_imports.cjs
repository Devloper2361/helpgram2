const fs = require('fs');
const file = 'src/pages/AdminCertifications.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/"\.\.\/components/g, '"@/components');
fs.writeFileSync(file, code);
