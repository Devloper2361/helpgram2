const fs = require('fs');
let code = fs.readFileSync('src/lib/wallet.ts', 'utf8');
code = code.replace(/prisma\.\\(\(tx\) => ([A-Za-z0-9_]+)\(tx, args\)\)/g, 'prisma.\((tx) => (tx, args), { maxWait: 15000, timeout: 15000 })');
fs.writeFileSync('src/lib/wallet.ts', code);