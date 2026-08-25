import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTests() {
  const reqEmail = `req_${Date.now()}@test.com`;
  const tskEmail = `tsk_${Date.now()}@test.com`;
  const hackerEmail = `hacker_${Date.now()}@test.com`;

  console.log("-> 1. Registering users");
  let rRes = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: reqEmail, password: "password", fullName: "ReviewReq" })
  });
  const reqToken = (await rRes.json()).token;
  const reqAuth = { "Authorization": `Bearer ${reqToken}`, "Content-Type": "application/json" };

  let tRes = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: tskEmail, password: "password", fullName: "ReviewTsk" })
  });
  const tskToken = (await tRes.json()).token;
  const tskAuth = { "Authorization": `Bearer ${tskToken}`, "Content-Type": "application/json" };

  let hRes = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: hackerEmail, password: "password", fullName: "Hacker" })
  });
  const hackerToken = (await hRes.json()).token;
  const hackerAuth = { "Authorization": `Bearer ${hackerToken}`, "Content-Type": "application/json" };

  const reqMe = await (await fetch("http://localhost:3000/api/auth/me", { headers: reqAuth })).json();
  const tskMe = await (await fetch("http://localhost:3000/api/auth/me", { headers: tskAuth })).json();
  
  await fetch("http://localhost:3000/api/wallet/deposit", {
    method: "POST", headers: reqAuth, body: JSON.stringify({ amount: 100 })
  });

  console.log("-> 2. Creating, starting & completing task");
  const ctRes = await fetch("http://localhost:3000/api/tasks", {
    method: "POST", headers: reqAuth,
    body: JSON.stringify({
      title: "Review Test Task", description: "Test review creation",
      price: 50, locationLat: 40, locationLng: -73, scheduledFor: new Date().toISOString()
    })
  });
  const task = (await ctRes.json()).task;

  await fetch(`http://localhost:3000/api/tasks/${task.id}/apply`, {
    method: "POST", headers: tskAuth, body: JSON.stringify({ message: "Ready to work!" })
  });

  let selRes = await fetch(`http://localhost:3000/api/tasks/${task.id}/select-helper`, {
    method: "POST", headers: reqAuth, body: JSON.stringify({ taskerId: tskMe.user.id })
  });
  console.log("Select Hepler:", await selRes.json());
  
  let startR = await fetch(`http://localhost:3000/api/tasks/${task.id}/start`, { method: "POST", headers: tskAuth });
  console.log("Start:", await startR.json());
  let proofR = await fetch(`http://localhost:3000/api/tasks/${task.id}/submit-proof`, { method: "POST", headers: tskAuth });
  console.log("Proof:", await proofR.json());
  let approveR = await fetch(`http://localhost:3000/api/tasks/${task.id}/approve`, { method: "POST", headers: reqAuth });
  console.log("Approve:", await approveR.json());

  await delay(1000);

  console.log("-> 3. Submitting Review");
  // Reviewer as Requester evaluating Tasker
  let revRes = await fetch(`http://localhost:3000/api/tasks/${task.id}/review`, {
    method: "POST", headers: reqAuth, body: JSON.stringify({ rating: 4, comment: "Good work, nice tasker" })
  });
  const rev1 = await revRes.json();
  if (rev1.review) console.log("✅ Review submitted successfully");
  else console.error("❌ Review failed", rev1);

  console.log("-> 4. Checking Duplicate Block");
  let dupRes = await fetch(`http://localhost:3000/api/tasks/${task.id}/review`, {
    method: "POST", headers: reqAuth, body: JSON.stringify({ rating: 5, comment: "I lied it was great" })
  });
  if (dupRes.status === 400) console.log("✅ Duplicate blocked successfully");
  else console.error("❌ Duplicate somehow accepted", dupRes.status);

  console.log("-> 5. Checking Unauthorized blocked");
  let hackRes = await fetch(`http://localhost:3000/api/tasks/${task.id}/review`, {
    method: "POST", headers: hackerAuth, body: JSON.stringify({ rating: 1, comment: "Bad work" })
  });
  if (hackRes.status === 403) console.log("✅ Unauthorized review blocked");
  else console.error("❌ Unauthorized review bypassed block");

  console.log("-> 6. Submitting Reverse Review");
  // Reviewer as Tasker evaluating Requester
  let revRes2 = await fetch(`http://localhost:3000/api/tasks/${task.id}/review`, {
    method: "POST", headers: tskAuth, body: JSON.stringify({ rating: 5, comment: "Great requester" })
  });
  const rev2 = await revRes2.json();
  if (rev2.review) console.log("✅ Tasker review submitted successfully");
  else console.error("❌ Tasker review failed", rev2);

  console.log("-> 7. Fetching Trust Metrics");
  let trustRes = await fetch(`http://localhost:3000/api/users/${tskMe.user.id}/trust`);
  let trustData = await trustRes.json();
  if (trustData.avgRating === 4 && trustData.trustScore > 50) {
     console.log(`✅ Trust recalculated accurately. Score: ${parseFloat(trustData.trustScore).toFixed(1)}, Avg Rating: ${trustData.avgRating}`);
  } else {
     console.error("❌ Trust calculation discrepancy:", trustData);
  }

  let myTrustRes = await fetch(`http://localhost:3000/api/users/${reqMe.user.id}/trust`);
  let myTrustData = await myTrustRes.json();
  if (myTrustData.avgRating === 5 && myTrustData.trustScore > 50) {
     console.log(`✅ Trust recalculated accurately. Score: ${parseFloat(myTrustData.trustScore).toFixed(1)}, Avg Rating: ${myTrustData.avgRating}`);
  } else {
     console.error("❌ Trust calculation discrepancy:", myTrustData);
  }
}

runTests().catch(console.error).finally(()=>prisma.$disconnect());
