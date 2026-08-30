const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  let report = {};

  try {
    // 1. Authenticate as WORKER
    const loginRes = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "helper@helpgram.local", password: "Helper@12345" })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    const headers = { "Content-Type": "application/json", "Cookie": `token=${token}` };
    const authHeaders = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }; // fallback if needed

    // 2. GET /api/tasks
    const tasksRes = await fetch("http://localhost:3000/api/tasks", { headers });
    report.getTasksStatus = tasksRes.status;
    const tasksData = await tasksRes.json();
    report.tasksLoaded = Array.isArray(tasksData.tasks);
    
    // 3. Find an OPEN task the worker hasn't requested
    const openTask = tasksData.tasks?.find(t => t.status === "OPEN" && t.requesterId !== loginData.user.id);
    report.foundOpenTask = !!openTask;

    // 4. Apply for the task
    if (openTask) {
      // First try to apply
      let applyRes = await fetch(`http://localhost:3000/api/tasks/${openTask.id}/apply`, {
        method: "POST",
        headers
      });
      report.applyStatus = applyRes.status;
      report.applyBody = await applyRes.json();
      
      // If Already Applied, that's fine, we can consider it a successful flow, 
      // but let's check what it is.
    }

    // 5. Test Welfare (Worker)
    const welfareRes = await fetch("http://localhost:3000/api/welfare/claims", { headers });
    report.welfareStatus = welfareRes.status;
    
    // 6. Test Welfare Admin (Requires SOCIETY_ADMIN or FEDERATION_ADMIN)
    // We expect a 403 Forbidden for a WORKER, which means the route parsed and denied correctly, not 500.
    const welfareAdminRes = await fetch("http://localhost:3000/api/welfare/claims/pending", { headers });
    report.welfareAdminStatus = welfareAdminRes.status;

  } catch (err) {
    report.error = err.message;
  }
  
  console.log(JSON.stringify(report, null, 2));
}

run();
