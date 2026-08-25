import { PrismaClient } from "@prisma/client";
import { updateMetricsAndTrust } from "./src/lib/trust.js";

const prisma = new PrismaClient();

async function runTest() {
  const user = await prisma.user.findFirst();
  if(!user) return console.log("No user");
  try {
     await prisma.$transaction(async tx => {
        await updateMetricsAndTrust(tx, user.id);
     });
     console.log("Success");
  }catch(e) {
     console.error(e);
  }
}

runTest().finally(() => prisma.$disconnect());
