const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRaw\`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'Task' AND column_name = 'isEmergency';
  \`;
  console.log('Exists:', result.length > 0);
  
  const migrations = await prisma.$queryRaw\`
    SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;
  \`;
  console.log('Migrations:', migrations);
}
main().catch(console.error).finally(() => prisma.$disconnect());
