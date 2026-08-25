import { prisma } from "./src/lib/prisma.js";

async function run() {
  // Login as customer
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "customer@helpgram.local", password: "Customer@12345" })
  });
  const token = (await loginRes.json()).token;

  const customerUser = await prisma.user.findUnique({ where: { email: "customer@helpgram.local" }});
  const helperUser = await prisma.user.findUnique({ where: { email: "helper@helpgram.local" }});
  
  const task = await prisma.task.findFirst({
    where: { requesterId: customerUser!.id, status: "OPEN" },
    include: { applications: true }
  });
  
  if (!task) {
    console.log("No OPEN task found for customer.");
    return;
  }
  
  console.log("Found task:", task.id);
  
  // Ensure helper applied
  let app = task.applications.find((a: any) => a.taskerId === helperUser!.id);
  if (!app) {
     console.log("Helper has not applied, creating application...");
     app = await prisma.taskApplication.create({
       data: { taskId: task.id, taskerId: helperUser!.id, message: "apply" }
     });
  }
  
  // Now try to select helper
  const selectRes = await fetch(`http://localhost:3000/api/tasks/${task.id}/select-helper`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ taskerId: helperUser!.id })
  });
  
  const selectData = await selectRes.text();
  console.log("Select Helper response status:", selectRes.status);
  console.log("Select Helper response:", selectData);
  
  await prisma.$disconnect();
}
run();
