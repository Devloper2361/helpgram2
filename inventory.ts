import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const counts = {
    User: await prisma.user.count(),
    Profile: await prisma.profile.count(),
    Wallet: await prisma.wallet.count(),
    Federation: await prisma.cooperativeFederation.count(),
    Society: await prisma.cooperativeSociety.count(),
    SocietyMembership: await prisma.societyMembership.count(),
    Skill: await prisma.skill.count(),
    Certification: await prisma.certification.count(),
    ServiceCategory: await prisma.serviceCategory.count(),
    Service: await prisma.service.count(),
    Task: await prisma.task.count(),
    TaskApplication: await prisma.taskApplication.count(),
    EscrowEntry: await prisma.escrowEntry.count(),
    Transaction: await prisma.transaction.count(),
    PlatformRevenue: await prisma.platformRevenue.count(),
    Notification: await prisma.notification.count(),
    MessageThread: await prisma.messageThread.count(),
    Dispute: await prisma.dispute.count(),
    MediaAttachment: await prisma.mediaAttachment.count(),
    Review: await prisma.review.count()
  };
  console.log(JSON.stringify(counts, null, 2));

  const users = await prisma.user.findMany({ select: { email: true } });
  if (users.length > 0) {
      console.log("Existing Users:", users.map(u => u.email).join(', '));
  } else {
      console.log("Existing Users: NONE");
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
