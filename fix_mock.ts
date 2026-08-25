import { prisma } from "./src/lib/prisma.js";

async function run() {
  const customer = await prisma.user.findUnique({ where: { email: "customer@helpgram.local" }});
  await prisma.wallet.update({
    where: { userId: customer.id },
    data: { balanceEscrowed: 500 }
  });
  console.log("Updated escrow balance");
  await prisma.$disconnect();
}
run();
