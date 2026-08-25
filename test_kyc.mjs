import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ take: 1 });
  if (users.length === 0) return console.log("No users to test with.");
  
  const userId = users[0].id;
  
  // Create test notification
  const notif = await prisma.notification.create({
    data: {
      userId,
      type: "SYSTEM",
      content: "Test Notification"
    }
  });
  console.log("Created notification:", notif.id);
  
  // Set verified KYC
  const kyc = await prisma.kYCVerification.upsert({
    where: { userId },
    create: { userId, status: "VERIFIED" },
    update: { status: "VERIFIED" }
  });
  console.log("Updated KYC status to:", kyc.status);
  
  process.exit(0);
}

main().catch(console.error);
