import fs from 'fs';
const dbSize = fs.statSync('prisma/dev.db').size;
console.log('Size:', dbSize);
