import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const tables = await prisma.$queryRaw`SELECT name FROM sqlite_schema WHERE type='table'`;
  console.log("Tables:", tables.map(t => t.name).join(', '));
  const counts = await Promise.all(
    tables.filter(t => t.name !== 'sqlite_sequence').map(async (t) => {
      const res = await prisma.$queryRawUnsafe(`SELECT count(*) as count FROM "${t.name}"`);
      return `${t.name}: ${Number(res[0].count)}`;
    })
  );
  console.log(counts.join('\n'));
}
run();
