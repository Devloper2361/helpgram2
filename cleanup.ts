import { prisma } from "./src/lib/prisma.js";

async function runCleanup() {
  const prefixes = ['AUDIT_', 'AUD2_', 'AUD3_', 'AUD4_', 'audit_', 'aud2_', 'aud3_', 'aud4_', 'SEC_', 'sec_', 'DISP_', 'disp_'];
  
  const matchesPrefix = (field: string) => ({
    OR: prefixes.map(p => ({ [field]: { startsWith: p } }))
  });

  const users = await prisma.user.findMany({ where: matchesPrefix('email') });
  const userIds = users.map(u => u.id);
  const tasks = await prisma.task.findMany({ where: matchesPrefix('title') });
  const taskIds = tasks.map(t => t.id);

  console.log(`Found ${users.length} users and ${tasks.length} tasks to clean.`);

  if (taskIds.length > 0) {
    await prisma.mediaAttachment.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.platformRevenue.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.escrowEntry.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.dispute.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.notification.deleteMany({ where: { relatedEntityId: { in: taskIds } } });
    await prisma.taskApplication.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.transaction.deleteMany({ where: { taskId: { in: taskIds } } });
    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
  }

  if (userIds.length > 0) {
    const wallets = await prisma.wallet.findMany({ where: { userId: { in: userIds } } });
    const walletIds = wallets.map(w => w.id);
    
    if (walletIds.length > 0) {
      await prisma.transaction.deleteMany({
        where: { walletId: { in: walletIds } }
      });
    }

    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.societyMembership.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.federationMembership.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.kYCVerification.deleteMany({ where: { userId: { in: userIds } } });
    
    const profiles = await prisma.profile.findMany({ where: { userId: { in: userIds } } });
    const profileIds = profiles.map(p => p.id);
    if (profileIds.length > 0) {
        await prisma.certification.deleteMany({ where: { profileId: { in: profileIds } } });
        await prisma.userMetrics.deleteMany({ where: { profileId: { in: profileIds } } });
    }
    await prisma.profile.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  await prisma.service.deleteMany({ where: matchesPrefix('name') });
  await prisma.serviceCategory.deleteMany({ where: matchesPrefix('name') });
  await prisma.cooperativeSociety.deleteMany({ where: matchesPrefix('name') });
  await prisma.cooperativeFederation.deleteMany({ where: matchesPrefix('name') });
  await prisma.skill.deleteMany({ where: matchesPrefix('name') });

  const remTasks = await prisma.task.count({ where: matchesPrefix('title') });
  const remUsers = await prisma.user.count({ where: matchesPrefix('email') });
  const remServices = await prisma.service.count({ where: matchesPrefix('name') });
  const remCategories = await prisma.serviceCategory.count({ where: matchesPrefix('name') });
  const remFederations = await prisma.cooperativeFederation.count({ where: matchesPrefix('name') });
  const remSocieties = await prisma.cooperativeSociety.count({ where: matchesPrefix('name') });
  const remSkills = await prisma.skill.count({ where: matchesPrefix('name') });

  const total = remTasks + remUsers + remServices + remCategories + remFederations + remSocieties + remSkills;
  console.log("REMAINING TEST RECORDS =", total);
}
runCleanup().catch(console.error).finally(() => process.exit(0));
