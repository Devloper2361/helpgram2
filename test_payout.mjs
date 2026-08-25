async function run() {
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@helpgram.local", password: "Admin@12345" })
  });
  const token = (await loginRes.json()).token;

  const disputeId = "5d9efd04-6d18-4ed4-8fa8-764f73444ac8";
  const res = await fetch(`http://localhost:3000/api/admin/disputes/${disputeId}/payout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
  });
  
  console.log(res.status, await res.text());
}
run();
