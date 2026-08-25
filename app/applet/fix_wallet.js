const fs = require('fs');
let code = fs.readFileSync('src/lib/wallet.ts', 'utf8');

const regex = /prisma\.\$transaction\(\(tx\) => ([A-Za-z0-9_]+)\(tx, args\)\)/g;
code = code.replace(regex, 'prisma.$transaction((tx) => $1(tx, args), { maxWait: 15000, timeout: 15000 })');

fs.writeFileSync('src/lib/wallet.ts', code);
console.log('Fixed wallet');
