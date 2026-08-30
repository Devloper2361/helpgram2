require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: "test-user-id", role: "SOCIETY_ADMIN" },
  process.env.JWT_SECRET || "default_secret"
);

fetch("http://localhost:3000/api/intelligence/insights", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify({ societyId: "dummy-society-id" })
}).then(async res => {
  console.log("STATUS:", res.status);
  console.log("BODY:", await res.text());
}).catch(err => {
  console.log("ERROR:", err.message);
});
