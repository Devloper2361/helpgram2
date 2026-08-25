async function run() {
  // Login as admin
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@helpgram.local", password: "Admin@12345" })
  });
  const token = (await loginRes.json()).token;

  // Try refunding
  const disputeId = "f4770510-0b3c-403b-a8de-abbbc320c561";
  const res = await fetch(`http://localhost:3000/api/admin/disputes/${disputeId}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
  });
  
  console.log(res.status, await res.text());
}
run();
