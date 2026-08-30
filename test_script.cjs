const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const report = {};

  try {
    // Authenticate as WORKER
    const loginRes = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "helper@helpgram.local", password: "Helper@12345" })
    });
    const loginData = await loginRes.json();
    const workerToken = loginData.token;
    const workerHeaders = { "Content-Type": "application/json", "Cookie": `token=${workerToken}` };

    // TEST 1: TASK LISTING
    const tasksRes = await fetch("http://localhost:3000/api/tasks", { headers: workerHeaders });
    report.test1 = {
      status: tasksRes.status,
      body: await tasksRes.json()
    };

    // TEST 2: FRESH APPLICATION
    const tasks = report.test1.body.tasks || [];
    let eligibleTask = null;
    
    // Find a task we haven't applied to yet. We need to check TaskApplication
    for (const t of tasks) {
      if (t.status === "OPEN" && t.requesterId !== loginData.user.id) {
        const existingApp = await prisma.taskApplication.findFirst({
          where: { taskId: t.id, taskerId: loginData.user.id }
        });
        if (!existingApp) {
          eligibleTask = t;
          break;
        }
      }
    }

    report.test2 = { foundEligibleTask: !!eligibleTask };
    if (eligibleTask) {
      report.test2.taskId = eligibleTask.id;
      const applyRes = await fetch(`http://localhost:3000/api/tasks/${eligibleTask.id}/apply`, {
        method: "POST",
        headers: workerHeaders
      });
      report.test2.status = applyRes.status;
      report.test2.body = await applyRes.json();
      
      const newApp = await prisma.taskApplication.findFirst({
        where: { taskId: eligibleTask.id, taskerId: loginData.user.id }
      });
      report.test2.appCreated = !!newApp;
    }

    // TEST 3: TASK DETAIL
    if (tasks.length > 0) {
      const detailRes = await fetch(`http://localhost:3000/api/tasks/${tasks[0].id}`, { headers: workerHeaders });
      report.test3 = {
        status: detailRes.status,
        body: await detailRes.json()
      };
    }

    // TEST 5: WORKER WELFARE
    const welfareRes = await fetch("http://localhost:3000/api/welfare/claims", { headers: workerHeaders });
    report.test5 = { status: welfareRes.status };

    // TEST 7: WELFARE AUTH CHECK (WORKER accessing /pending)
    const welfarePendingResWorker = await fetch("http://localhost:3000/api/welfare/claims/pending", { headers: workerHeaders });
    report.test7 = { status: welfarePendingResWorker.status };

    // TEST 6: SOCIETY ADMIN WELFARE
    // The user 'worker15@helpgram.local' has SOCIETY_ADMIN role based on previous logs
    const adminLoginRes = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "worker15@helpgram.local", password: "Worker@12345" })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;
    const adminHeaders = { "Content-Type": "application/json", "Cookie": `token=${adminToken}` };
    
    if (adminToken) {
        const welfarePendingResAdmin = await fetch("http://localhost:3000/api/welfare/claims/pending", { headers: adminHeaders });
        report.test6 = { status: welfarePendingResAdmin.status };
    }

  } catch (err) {
    report.error = err.message;
  }
  
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}

run();
