const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const report = {};
  try {
    const workerLoginRes = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "helper@helpgram.local", password: "Helper@12345" })
    });
    const workerLoginData = await workerLoginRes.json();
    const workerHeaders = { "Content-Type": "application/json", "Cookie": `token=${workerLoginData.token}` };
    const workerId = workerLoginData.user?.id;

    const adminLoginRes = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "worker15@helpgram.local", password: "Worker@12345" })
    });
    const adminLoginData = await adminLoginRes.json();
    const adminHeaders = { "Content-Type": "application/json", "Cookie": `token=${adminLoginData.token}` };

    const t1Res = await fetch("http://localhost:3000/api/tasks", { headers: workerHeaders });
    report.t1 = { status: t1Res.status };
    const tasksData = await t1Res.json();
    const tasks = tasksData.tasks || [];

    const openTask = tasks.find(t => t.status === "OPEN");
    if (openTask) {
      const t3Res = await fetch(`http://localhost:3000/api/tasks/${openTask.id}`, { headers: workerHeaders });
      report.t3 = { status: t3Res.status, hasData: !!(await t3Res.json()).task };
    }

    let freshTask = null;
    if (workerId) {
      for (const t of tasks) {
        if (t.status === "OPEN" && t.requesterId !== workerId) {
          const existingApp = await prisma.taskApplication.findFirst({
            where: { taskId: t.id, taskerId: workerId }
          });
          if (!existingApp) {
            freshTask = t;
            break;
          }
        }
      }
    }
    
    if (freshTask) {
       const t4Res = await fetch(`http://localhost:3000/api/tasks/${freshTask.id}/apply`, {
         method: "POST", headers: workerHeaders
       });
       report.t4 = { status: t4Res.status };
    } else {
       report.t4 = { status: "NO_FRESH_TASK" };
    }

    const t5Res1 = await fetch("http://localhost:3000/api/welfare/claims", { headers: adminHeaders });
    report.t5 = { claimsStatus: t5Res1.status };

    const t6Res1 = await fetch("http://localhost:3000/api/welfare/claims", { headers: workerHeaders });
    report.t6 = { claimsStatus: t6Res1.status };

  } catch(e) {
    report.error = e.message;
  }
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}
run();
