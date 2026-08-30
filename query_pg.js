import { PrismaClient } from '@prisma/client';
// We need to generate a client from schema_v2 or just connect directly using pg
import { execSync } from 'child_process';
try {
  const output = execSync('psql postgresql://helpgram_dev:dev_password@localhost:5432/helpgram?schema=public -c "SELECT count(*) FROM \\"User\\";"');
  console.log("Postgres Users:", output.toString());
} catch (e) {
  console.error("PSQL error:", e.message);
}
