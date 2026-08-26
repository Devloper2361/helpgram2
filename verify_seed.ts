import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const usersToCheck = [
  { role: 'CUSTOMER', email: 'customer@helpgram.local', pass: 'Customer@12345' },
  { role: 'WORKER', email: 'helper@helpgram.local', pass: 'Helper@12345' },
  { role: 'WORKER', email: 'helper2@helpgram.local', pass: 'Helper@12345' },
  { role: 'WORKER', email: 'helper.unverified@helpgram.local', pass: 'Helper@12345' },
  { role: 'WORKER', email: 'helper.lowtrust@helpgram.local', pass: 'Helper@12345' },
  { role: 'FEDERATION_ADMIN', email: 'moderator@helpgram.local', pass: 'Admin@12345' },
  { role: 'SUPER_ADMIN', email: 'admin@helpgram.local', pass: 'Admin@12345' }
];

async function run() {
  console.log("=== USER AND PASSWORD VERIFICATION ===");
  for (const u of usersToCheck) {
    const user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      console.log(`${u.email} -> EXISTS=NO`);
    } else {
      const match = await bcrypt.compare(u.pass, user.passwordHash);
      console.log(`${u.email} -> ROLE MATCH=${user.role === u.role ? 'YES' : 'NO ('+user.role+')'} | PASS MATCH=${match ? 'YES' : 'NO'}`);
    }
  }

  console.log("\n=== HTTP LOGIN TEST ===");
  const testAccounts = [
    { label: 'Customer', email: 'customer@helpgram.local', pass: 'Customer@12345' },
    { label: 'Worker', email: 'helper@helpgram.local', pass: 'Helper@12345' },
    { label: 'Federation Admin', email: 'moderator@helpgram.local', pass: 'Admin@12345' },
    { label: 'Super Admin', email: 'admin@helpgram.local', pass: 'Admin@12345' }
  ];

  for (const acc of testAccounts) {
    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: acc.email, password: acc.pass })
      });
      const body = await res.json().catch(() => null);
      const isPass = res.status === 200 && !!body?.token;
      console.log(`ROLE: ${acc.label} | EMAIL: ${acc.email} | HTTP STATUS: ${res.status} | LOGIN = ${isPass ? 'PASS' : 'FAIL'}`);
    } catch (e: any) {
      console.log(`ROLE: ${acc.label} | EMAIL: ${acc.email} | HTTP ERROR: ${e.message} | LOGIN = FAIL`);
    }
  }

  console.log("\n=== FINAL DATABASE CHECK ===");
  const counts = {
    User: await prisma.user.count(),
    Task: await prisma.task.count(),
    EscrowEntry: await prisma.escrowEntry.count(),
    Transaction: await prisma.transaction.count(),
    PlatformRevenue: await prisma.platformRevenue.count()
  };
  console.log("Record Counts:", JSON.stringify(counts));
}

run().catch(console.error).finally(() => prisma.$disconnect());
