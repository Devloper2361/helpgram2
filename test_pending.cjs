const jwt = require('jsonwebtoken');

async function run() {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "helper@helpgram.local", password: "Helper@12345" })
  });
  const loginData = await loginRes.json();
  
  const workerHeaders = { "Content-Type": "application/json", "Cookie": `token=${loginData.token}` };
  const welfarePendingResWorker = await fetch("http://localhost:3000/api/welfare/claims/pending", { headers: workerHeaders });
  
  console.log("Status:", welfarePendingResWorker.status);
  const text = await welfarePendingResWorker.text();
  console.log("Body:", text.substring(0, 200));
}
run();
