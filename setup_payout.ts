import { prisma } from "./src/lib/prisma.js";

async function run() {
  const customer = await prisma.user.findUnique({ where: { email: "customer@helpgram.local" }});
  const tasker = await prisma.user.findUnique({ where: { email: "helper@helpgram.local" }});

  // Create task
  const task = await prisma.task.create({
    data: {
      requesterId: customer.id,
      taskerId: tasker.id,
      title: "Test Dispute Task Payout",
      description: "Need help",
      price: 500,
      status: "DISPUTED",
      scheduledFor: new Date(),
      locationLat: 10,
      locationLng: 10
    }
  });

  await prisma.wallet.update({
    where: { userId: customer.id },
    data: { balanceEscrowed: { increment: 500 } }
  });

  const escrow = await prisma.escrowEntry.create({
    data: {
      taskId: task.id,
      amount: 500,
      status: "DISPUTED",
    }
  });

  const dispute = await prisma.dispute.create({
    data: {
      taskId: task.id,
      raisedById: tasker.id,
      reason: "Customer won't release",
      status: "PENDING_REVIEW"
    }
  });

  console.log("Created Dispute ID:", dispute.id);
  await prisma.$disconnect();
}
run();
