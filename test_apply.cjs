const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

async function run() {
  // 1. Get token by hitting login directly, or just minting it, but let's use the actual API.
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "helper@helpgram.local", password: "Helper@12345" })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  if (!token) {
    console.log("Failed to login");
    return;
  }
  console.log("Logged in as worker15");
  const decoded = jwt.decode(token);
  const workerId = decoded.userId;

  // 2. Find a task to apply for using the fairShare logic to guarantee eligibility
  // Or just find one that is OPEN and not requested by the worker
  const eligibleTask = await prisma.task.findFirst({
    where: { 
      status: 'OPEN',
      requesterId: { not: workerId }
    }
  });

  if (!eligibleTask) {
    console.log("No eligible tasks found to apply for.");
    return;
  }
  
  console.log(`Applying to task: ${eligibleTask.id}`);

  // 3. Apply for the task
  const applyRes = await fetch(`http://localhost:3000/api/tasks/${eligibleTask.id}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cookie": `token=${token}` }
  });

  const applyStatus = applyRes.status;
  const applyData = await applyRes.json();

  console.log("HTTP Status:", applyStatus);
  console.log("Response Body:", JSON.stringify(applyData));

  // 4. Verify TaskApplication was created
  const application = await prisma.taskApplication.findFirst({
    where: { taskId: eligibleTask.id, taskerId: workerId }
  });

  console.log("TaskApplication created:", !!application);
  
  await prisma.$disconnect();
}
run();
