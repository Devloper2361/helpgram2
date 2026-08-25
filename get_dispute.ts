import { prisma } from "./src/lib/prisma.js";

async function run() {
  const taskId = "20736e3e-d118-4554-ba22-54a79702fc88";
  
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { dispute: true, escrowEntry: true }
  });
  
  if (!task) {
    console.log("Task not found");
    return;
  }
  
  console.log("Task:", task.id, task.status);
  console.log("Dispute:", task.dispute ? task.dispute.id + " " + task.dispute.status : "None");
  console.log("Escrow:", task.escrowEntry ? task.escrowEntry.id + " " + task.escrowEntry.status + " amt: " + task.escrowEntry.amount : "None");
  
  const transactions = await prisma.transaction.findMany({
    where: { taskId: task.id }
  });
  console.log("Transactions count:", transactions.length);
  
  await prisma.$disconnect();
}
run();
