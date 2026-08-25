import { prisma } from "./src/lib/prisma.js";

async function run() {
  const customer = await prisma.user.findUnique({ where: { email: "customer@helpgram.local" }});
  const tasker = await prisma.user.findUnique({ where: { email: "helper@helpgram.local" }});

  // Create task
  const task = await prisma.task.create({
    data: {
      requesterId: customer.id,
      taskerId: tasker.id,
      title: "Test Dispute Task",
      description: "Need help",
      price: 500,
      status: "DISPUTED", // Must be disputed for dispute logic? No, let's just make it DISPUTED. Wait, logic says TaskStatus.COMPLETED or CANCELLED or whatever.
      scheduledFor: new Date(),
      locationLat: 10,
      locationLng: 10
    }
  });

  // Create Wallet entries if needed
  let reqWallet = await prisma.wallet.findUnique({ where: { userId: customer.id }});
  if (!reqWallet) reqWallet = await prisma.wallet.create({ data: { userId: customer.id } });
  
  let taskerWallet = await prisma.wallet.findUnique({ where: { userId: tasker.id }});
  if (!taskerWallet) taskerWallet = await prisma.wallet.create({ data: { userId: tasker.id } });

  // Create Escrow
  const escrow = await prisma.escrowEntry.create({
    data: {
      taskId: task.id,
      amount: 500,
      status: "DISPUTED",
    }
  });

  // Create Dispute
  const dispute = await prisma.dispute.create({
    data: {
      taskId: task.id,
      raisedById: customer.id,
      reason: "Terrible job",
      status: "PENDING_REVIEW"
    }
  });

  console.log("Created Task ID:", task.id);
  console.log("Created Dispute ID:", dispute.id);
  await prisma.$disconnect();
}
run();
