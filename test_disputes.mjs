import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';

async function request(endpoint, method, token, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(`${API_URL}${endpoint}`, options);
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || data };
  }
  return data;
}

async function runTests() {
  console.log("-> 1. Registering users");
  const suffix = Date.now();
  const reqRes = await request('/auth/register', 'POST', null, { email: `r_${suffix}@test.com`, password: 'password', role: 'USER' });
  const tskRes = await request('/auth/register', 'POST', null, { email: `t_${suffix}@test.com`, password: 'password', role: 'USER' });
  const auth1 = await request('/auth/login', 'POST', null, { email: `r_${suffix}@test.com`, password: 'password' });
  const auth2 = await request('/auth/login', 'POST', null, { email: `t_${suffix}@test.com`, password: 'password' });
  const unauthAuth = await request('/auth/register', 'POST', null, { email: `u_${suffix}@test.com`, password: 'password' });

  const adRes = await request('/auth/register', 'POST', null, { email: `a_${suffix}@test.com`, password: 'password' });
  await prisma.user.update({ where: { email: `a_${suffix}@test.com` }, data: { role: 'ADMIN' } });
  const authAdmin = await request('/auth/login', 'POST', null, { email: `a_${suffix}@test.com`, password: 'password' });

  console.log("-> 2. Setup Wallets & Task");
  const rWallet = await prisma.wallet.findUnique({ where: { userId: auth1.user.id }});
  await prisma.transaction.create({
    data: {
      walletId: rWallet.id,
      amount: 1000,
      balanceAfter: 1000,
      type: "DEPOSIT",
      status: "COMPLETED"
    }
  });
  await prisma.wallet.update({ where: { id: rWallet.id }, data: { balanceAvailable: 1000 }});

  // Flow helper
  async function createTaskAndDispute(title) {
    const task = await request('/tasks', 'POST', auth1.token, {
      title, description: "Test dispute", price: 100, scheduledFor: new Date().toISOString(), locationLat: 0, locationLng: 0
    });
    const tId = task.task.id;
    await request(`/tasks/${tId}/apply`, 'POST', auth2.token, { message: "hi" });
    await request(`/tasks/${tId}/select-helper`, 'POST', auth1.token, { taskerId: auth2.user.id });
    
    // Dispute
    const disputeRes = await request(`/tasks/${tId}/dispute`, 'POST', auth1.token, { reason: "Tasker no showed" });
    return { task: task.task, dId: disputeRes.task?.id, disputeRes };
  }

  const flow1 = await createTaskAndDispute("Task 1 Refund");
  
  console.log("-> 3. Duplicate and Unauthorized checks");
  const dup = await request(`/tasks/${flow1.task.id}/dispute`, 'POST', auth2.token, { reason: "Another one" });
  if (dup.error) console.log("✅ Duplicate dispute blocked");
  else console.log("❌ Duplicate dispute allowed", dup);

  const unauth = await request(`/tasks/${flow1.task.id}/dispute`, 'POST', unauthAuth.token, { reason: "Me too" });
  if (unauth.error) console.log("✅ Unauthorized dispute blocked");
  else console.log("❌ Unauthorized dispute allowed", unauth);

  console.log("-> 4. Upload Evidence");
  const dObj = await prisma.dispute.findUnique({ where: { taskId: flow1.task.id } });
  const evi = await request(`/disputes/${dObj.id}/evidence`, 'POST', auth1.token, { url: "http://example.com/img.png", fileType: "png" });
  if (evi.media) console.log("✅ Evidence uploaded");
  else console.log("❌ Evidence failed", evi);

  console.log("-> 5. Admin Refund");
  const t1Admin = await request(`/admin/disputes/${dObj.id}/refund`, 'POST', authAdmin.token, { resolution: "full refund" });
  if (t1Admin.dispute && t1Admin.dispute.status === "RESOLVED_REFUND") console.log("✅ Admin Refund Successful");
  else console.log("❌ Admin Refund Failed", t1Admin);

  console.log("-> 6. Admin Payout");
  const flow2 = await createTaskAndDispute("Task 2 Payout");
  const dObj2 = await prisma.dispute.findUnique({ where: { taskId: flow2.task.id } });
  const t2Admin = await request(`/admin/disputes/${dObj2.id}/payout`, 'POST', authAdmin.token, { resolution: "tasker did it" });
  if (t2Admin.dispute && t2Admin.dispute.status === "RESOLVED_PAYOUT") console.log("✅ Admin Payout Successful");
  else console.log("❌ Admin Payout Failed", t2Admin);

  console.log("-> 7. Partial Release");
  const flow3 = await createTaskAndDispute("Task 3 Partial");
  const dObj3 = await prisma.dispute.findUnique({ where: { taskId: flow3.task.id } });
  const t3Admin = await request(`/admin/disputes/${dObj3.id}/partial-release`, 'POST', authAdmin.token, { requesterAmount: 40, taskerAmount: 60 });
  if (t3Admin.dispute && t3Admin.dispute.status === "RESOLVED_PAYOUT") console.log("✅ Admin Partial Release Successful");
  else console.log("❌ Admin Partial Release Failed", t3Admin);

  const dObj3Check = await prisma.escrowEntry.findUnique({ where: { taskId: flow3.task.id } });
  if (dObj3Check.status === 'PARTIAL_RELEASE') console.log("✅ Escrow updated to PARTIAL_RELEASE");
  else console.log("❌ Escrow is not PARTIAL_RELEASE", dObj3Check);

  const logs = await prisma.adminLog.findMany({ where: { adminId: authAdmin.user.id } });
  if (logs.length === 3) console.log("✅ Admin logs created appropriately");
  else console.log("❌ Admin logs missing or too many", logs.length);
}

runTests().catch(console.error).finally(() => prisma.$disconnect());
