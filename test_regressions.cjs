const jwt = require('jsonwebtoken');

async function run() {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "helper@helpgram.local", password: "Helper@12345" })
  });
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", "Cookie": `token=${token}` };

  // 1. Marketplace listing
  const tasksRes = await fetch("http://localhost:3000/api/tasks", { headers });
  console.log("Tasks status:", tasksRes.status);
  
  // Find a completed task for invoice testing
  const tasks = await tasksRes.json();
  const completedTask = tasks.tasks?.find(t => t.status === "COMPLETED");

  if (completedTask) {
    const invRes = await fetch(`http://localhost:3000/api/tasks/${completedTask.id}/invoice`, { headers });
    console.log("Invoice status:", invRes.status);
  } else {
    console.log("No completed task found to test invoice, but syntax is fixed.");
  }

  // 2. Intelligence demand
  const intelRes = await fetch("http://localhost:3000/api/intelligence/market-demand", { headers });
  console.log("Intelligence status:", intelRes.status);
}
run();
