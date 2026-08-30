const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // PRE-FLIGHT CHECKS
    const user = await prisma.user.findUnique({
      where: { email: 'worker15@helpgram.local' },
      include: {
        societyMemberships: {
          include: { society: true }
        }
      }
    });

    if (!user) throw new Error("worker15@helpgram.local does not exist.");
    if (user.role !== 'WORKER') throw new Error(`User role is not WORKER, it is ${user.role}.`);

    const demoSocietyMemberships = user.societyMemberships.filter(m => m.society.name === 'Demo Society');
    if (demoSocietyMemberships.length !== 1) throw new Error(`Expected exactly 1 Demo Society membership, found ${demoSocietyMemberships.length}.`);

    const membership = demoSocietyMemberships[0];
    if (membership.role !== 'MEMBER') throw new Error(`Membership role is not MEMBER, it is ${membership.role}.`);
    if (membership.status !== 'ACTIVE') throw new Error(`Membership status is not ACTIVE, it is ${membership.status}.`);

    const beforeUsersCount = await prisma.user.count();
    const beforeMembershipsCount = await prisma.societyMembership.count();

    // PERFORM CHANGES
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'SOCIETY_ADMIN' }
    });

    await prisma.societyMembership.update({
      where: { id: membership.id },
      data: { role: 'ADMIN' }
    });

    // VERIFICATION
    const verifiedUser = await prisma.user.findUnique({
      where: { email: 'worker15@helpgram.local' },
      include: { societyMemberships: { include: { society: true } } }
    });

    const afterUsersCount = await prisma.user.count();
    const afterMembershipsCount = await prisma.societyMembership.count();

    const report = {
      accountModified: verifiedUser.email,
      oldGlobalRole: user.role,
      newGlobalRole: verifiedUser.role,
      societyName: verifiedUser.societyMemberships[0].society.name,
      oldMembershipRole: membership.role,
      newMembershipRole: verifiedUser.societyMemberships[0].role,
      membershipStatus: verifiedUser.societyMemberships[0].status,
      duplicateMembershipCheck: verifiedUser.societyMemberships.length === 1 ? 'Passed (Exactly 1)' : 'Failed',
      noOtherUsersModified: (beforeUsersCount === afterUsersCount && beforeMembershipsCount === afterMembershipsCount) ? 'Confirmed' : 'Failed'
    };

    console.log(JSON.stringify(report, null, 2));

  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
