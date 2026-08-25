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
    body: JSON.stringify({ email: reqEmail, password: "password", fullName: "ChatReq" })
  });
  const reqToken = (await rRes.json()).token;
  const reqAuth = { "Authorization": `Bearer ${reqToken}`, "Content-Type": "application/json" };

  let tRes = await fetch("http://localhost:3000/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: tskEmail, password: "password", fullName: "ChatTsk" })
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

  console.log("-> 2. Creating & applying for task");
  const ctRes = await fetch("http://localhost:3000/api/tasks", {
    method: "POST", headers: reqAuth,
    body: JSON.stringify({
      title: "Chat Test Task", description: "Test chat thread creation",
      price: 50, locationLat: 40, locationLng: -73, scheduledFor: new Date().toISOString()
    })
  });
  const task = (await ctRes.json()).task;

  await fetch(`http://localhost:3000/api/tasks/${task.id}/apply`, {
    method: "POST", headers: tskAuth, body: JSON.stringify({ message: "Ready to chat!" })
  });

  console.log("-> 3. Selecting helper (should create thread)");
  await fetch(`http://localhost:3000/api/tasks/${task.id}/select-helper`, {
    method: "POST", headers: reqAuth, body: JSON.stringify({ taskerId: tskMe.user.id })
  });
  
  await delay(500);

  let threadsRes = await (await fetch("http://localhost:3000/api/chat/threads", { headers: reqAuth })).json();
  if (threadsRes.threads && threadsRes.threads.length > 0) {
     console.log("✅ Thread creation successful");
  } else {
     console.error("❌ Thread creation failed", threadsRes);
  }

  console.log("-> 4. Sending text message (Tasker -> Requester)");
  let msgRes = await fetch(`http://localhost:3000/api/chat/${task.id}`, {
    method: "POST", headers: tskAuth, body: JSON.stringify({ content: "Hello Requester!", type: "TEXT" })
  });
  const msg1 = (await msgRes.json()).message;
  if (msg1?.content === "Hello Requester!") console.log("✅ Text message sent");
  else console.error("❌ Text message failed");

  console.log("-> 5. Sending image message (Requester -> Tasker)");
  let imgRes = await fetch(`http://localhost:3000/api/chat/${task.id}`, {
    method: "POST", headers: reqAuth, body: JSON.stringify({ content: "http://example.com/img.jpg", type: "IMAGE" })
  });
  const msg2 = (await imgRes.json()).message;
  if (msg2?.type === "IMAGE") console.log("✅ Image message sent");
  else console.error("❌ Image message failed");

  await delay(500);

  console.log("-> 6. Testing Unread Counts and Read Receipts");
  // Check that Tasker has 1 unread message (the image)
  let tThreads = await (await fetch("http://localhost:3000/api/chat/threads", { headers: tskAuth })).json();
  if (tThreads.threads[0].unreadCount === 1) console.log("✅ Unread counter correct");
  else console.error("❌ Unread counter incorrect:", tThreads.threads[0].unreadCount);

  // Mark msg2 as read by tasker
  let readRes = await fetch(`http://localhost:3000/api/chat/messages/${msg2.id}/read`, {
    method: "PUT", headers: tskAuth
  });
  const updatedMsg = (await readRes.json()).message;
  if (updatedMsg.isRead === true) console.log("✅ Read receipt logged");
  else console.error("❌ Read receipt failed");

  // Verify it went to 0
  tThreads = await (await fetch("http://localhost:3000/api/chat/threads", { headers: tskAuth })).json();
  if (tThreads.threads[0].unreadCount === 0) console.log("✅ Unread count cleared after read!");
  else console.error("❌ Unread counter not cleared");

  console.log("-> 7. Testing Pagination");
  // Send 60 messages to test pagination limit of 50
  console.log("   (Creating 60 dummy messages...)");
  const pm = [];
  for(let i=0; i<60; i++) {
     pm.push(fetch(`http://localhost:3000/api/chat/${task.id}`, {
        method: "POST", headers: reqAuth, body: JSON.stringify({ content: `Msg ${i}` })
     }));
  }
  await Promise.all(pm);
  
  let pagedRes = await fetch(`http://localhost:3000/api/chat/${task.id}?page=1&limit=50`, { headers: tskAuth });
  let pagedData = await pagedRes.json();
  if (pagedData.messages.length === 50) console.log("✅ Pagination returned 50 items");
  else console.error(`❌ Pagination returned ${pagedData.messages.length} items`);

  console.log("-> 8. Testing IDOR Protection");
  let hackerGetChat = await fetch(`http://localhost:3000/api/chat/${task.id}`, { headers: hackerAuth });
  if (hackerGetChat.status === 403) console.log("✅ Hacker viewing chat blocked (IDOR)");
  else console.error("❌ Hacker viewed chat!", hackerGetChat.status);

  let hackerPostChat = await fetch(`http://localhost:3000/api/chat/${task.id}`, {
    method: "POST", headers: hackerAuth, body: JSON.stringify({ content: "Malicious Injection!" })
  });
  if (hackerPostChat.status === 403) console.log("✅ Hacker posting to chat blocked (IDOR)");
  else console.error("❌ Hacker posted to chat!", hackerPostChat.status);

  let hackerMarkRead = await fetch(`http://localhost:3000/api/chat/messages/${msg2.id}/read`, {
    method: "PUT", headers: hackerAuth
  });
  if (hackerMarkRead.status === 403) console.log("✅ Hacker marking message read blocked (IDOR)");
  else console.error("❌ Hacker marked message read!", hackerMarkRead.status);

}

runTests().catch(console.error).finally(()=>prisma.$disconnect());
