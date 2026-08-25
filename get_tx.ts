import { prisma } from "./src/lib/prisma.js";
async function run() {
  const taskId = "20736e3e-d118-4554-ba22-54a79702fc88";
  const txs = await prisma.transaction.findMany({ where: { taskId } });
  console.log(txs.map(t => `${t.type} ${t.amount} ${t.status}`));
  await prisma.$disconnect();
}
run();
