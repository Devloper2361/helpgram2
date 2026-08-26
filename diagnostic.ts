import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const usersToCheck = [
  { email: 'customer@helpgram.local', pass: 'Customer@12345' },
  { email: 'helper@helpgram.local', pass: 'Helper@12345' },
  { email: 'helper2@helpgram.local', pass: 'Helper@12345' },
  { email: 'helper.unverified@helpgram.local', pass: 'Helper@12345' },
  { email: 'helper.lowtrust@helpgram.local', pass: 'Helper@12345' },
  { email: 'moderator@helpgram.local', pass: 'Admin@12345' },
  { email: 'admin@helpgram.local', pass: 'Admin@12345' }
];

async function run() {
  console.log("=== DB CHECK ===");
  for (const u of usersToCheck) {
    const user = await prisma.user.findUnique({
      where: { email: u.email },
      include: { profile: true, wallet: true }
    });

    if (!user) {
      console.log(`${u.email} | EXISTS=NO`);
    } else {
      const hasHash = !!user.passwordHash;
      let match = false;
      if (hasHash) {
         match = await bcrypt.compare(u.pass, user.passwordHash);
      }
      console.log(`${u.email} | EXISTS=YES | ROLE=${user.role} | HAS_HASH=${hasHash} | PROFILE=${!!user.profile} | WALLET=${!!user.wallet} | PASS_MATCH=${match}`);
    }
  }

  console.log("=== HTTP CHECK ===");
  try {
    const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "customer@helpgram.local", password: "Customer@12345" })
    });
    console.log(`HTTP STATUS: ${res.status}`);
    const body = await res.json().catch(() => null);
    if (body) {
        if (body.token) body.token = "<hidden_jwt>";
    }
    console.log(`RESPONSE: ${JSON.stringify(body)}`);
  } catch (e: any) {
    console.log("HTTP ERROR:", e.message);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
