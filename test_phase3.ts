import { prisma } from "./src/lib/prisma.js";
import { triggerEmergencyDispatch } from "./src/lib/dispatch.js";
import { findAndRankEligibleWorkers } from "./src/lib/fairShare.js";
import { TaskStatus, TransactionType, TransactionStatus, VerificationStatus } from "./src/lib/enums.js";

async function runTests() {
  console.log("=== STARTING PHASE 3 VERIFICATION ===");
  
  const ignore = (p: any) => p.catch(() => {});
  await ignore(prisma.notification.deleteMany({ where: { user: { email: { startsWith: 'p3_test_' } } } }));
  await ignore(prisma.taskApplication.deleteMany({ where: { tasker: { email: { startsWith: 'p3_test_' } } } }));
  await ignore(prisma.task.deleteMany({ where: { title: { startsWith: 'P3_TEST_' } } }));
  await ignore(prisma.wallet.deleteMany({ where: { user: { email: { startsWith: 'p3_test_' } } } }));
  await ignore(prisma.certification.deleteMany({ where: { profile: { user: { email: { startsWith: 'p3_test_' } } } } }));
  await ignore(prisma.profile.deleteMany({ where: { user: { email: { startsWith: 'p3_test_' } } } }));
  await ignore(prisma.societyMembership.deleteMany({ where: { user: { email: { startsWith: 'p3_test_' } } } }));
  await ignore(prisma.user.deleteMany({ where: { email: { startsWith: 'p3_test_' } } }));
  await ignore(prisma.cooperativeSociety.deleteMany({ where: { name: 'P3_Test_Society' } }));
  await ignore(prisma.service.deleteMany({ where: { name: 'P3_Test_Service' } }));
  await ignore(prisma.serviceCategory.deleteMany({ where: { name: 'P3_Test_Category' } }));
  await ignore(prisma.cooperativeFederation.deleteMany({ where: { name: 'P3_Test_Fed' } }));
  await ignore(prisma.skill.deleteMany({ where: { name: 'test_skill_1' } }));

  // 1. Setup Base Test Data
  const skill = await prisma.skill.create({
    data: { name: 'test_skill_1' }
  });

  const fed = await prisma.cooperativeFederation.create({
    data: {
      name: 'P3_Test_Fed',
      state: 'TestState',
      societies: {
        create: {
          name: 'P3_Test_Society',
          location: 'Test Loc',
          status: 'ACTIVE'
        }
      }
    },
    include: { societies: true }
  });
  
  const soc = fed.societies[0];
  
  const category = await prisma.serviceCategory.create({
    data: {
      name: 'P3_Test_Category',
      federationId: fed.id
    }
  });

  const service = await prisma.service.create({
    data: {
      name: 'P3_Test_Service',
      categoryId: category.id,
      basePrice: 500,
      description: 'Test',
      status: 'ACTIVE',
      skills: { connect: { id: skill.id } }
    }
  });
  
  const requester = await prisma.user.create({
    data: {
      email: 'p3_test_req@example.com',
      passwordHash: 'hash',
      role: 'REQUESTER',
      profile: {
        create: {
          fullName: 'P3 Test Requester',
          locationLat: 10.00,
          locationLng: 10.00,
          trustScore: 90
        }
      },
      societyMemberships: {
        create: {
          societyId: soc.id,
          status: 'ACTIVE'
        }
      },
      wallet: {
        create: { balanceAvailable: 10000, balanceEscrowed: 0 }
      }
    }
  });

  // Create Worker W1 (Eligible, Highest Trust, Nearest, NO ACTIVE TASKS, NO RECENT TASKS)
  const w1 = await prisma.user.create({
    data: {
      email: 'p3_test_w1@example.com',
      passwordHash: 'hash',
      role: 'WORKER',
      profile: {
        create: {
          fullName: 'P3 Test W1',
          locationLat: 10.01,
          locationLng: 10.01,
          trustScore: 95, // High Trust
          skills: { connect: { id: skill.id } },
          certifications: {
             create: { skillId: skill.id, status: VerificationStatus.VERIFIED }
          }
        }
      },
      societyMemberships: {
        create: {
          societyId: soc.id,
          status: 'ACTIVE'
        }
      },
      wallet: { create: { balanceAvailable: 0, balanceEscrowed: 0 } }
    }
  });

  // Create Worker W2 (Eligible, Good Trust, NO ACTIVE TASKS, BUT HAS 5000 RECENT EARNINGS)
  const w2 = await prisma.user.create({
    data: {
      email: 'p3_test_w2@example.com',
      passwordHash: 'hash',
      role: 'WORKER',
      profile: {
        create: {
          fullName: 'P3 Test W2',
          locationLat: 10.02,
          locationLng: 10.02,
          trustScore: 90,
          skills: { connect: { id: skill.id } },
          certifications: {
             create: { skillId: skill.id, status: VerificationStatus.VERIFIED }
          }
        }
      },
      societyMemberships: {
        create: {
          societyId: soc.id,
          status: 'ACTIVE'
        }
      },
      wallet: { create: { balanceAvailable: 0, balanceEscrowed: 0 } }
    }
  });
  
  // Fake previous completed task for W2 to penalize their opportunity score
  await prisma.task.create({
    data: {
      title: 'P3_TEST_Old_Task',
      description: 'Old task',
      price: 5000,
      status: TaskStatus.COMPLETED,
      isEmergency: false,
      scheduledFor: new Date(),
      locationLat: 10.00,
      locationLng: 10.00,
      requesterId: requester.id,
      taskerId: w2.id,
      serviceId: service.id,
      completedAt: new Date()
    }
  });

  // Create Worker W3 (Ineligible: Trust too low)
  const w3 = await prisma.user.create({
    data: {
      email: 'p3_test_w3@example.com',
      passwordHash: 'hash',
      role: 'WORKER',
      profile: {
        create: {
          fullName: 'P3 Test W3',
          locationLat: 10.00,
          locationLng: 10.00,
          trustScore: 10, // Fails Hard Eligibility
          skills: { connect: { id: skill.id } },
          certifications: {
             create: { skillId: skill.id, status: VerificationStatus.VERIFIED }
          }
        }
      },
      societyMemberships: {
        create: {
          societyId: soc.id,
          status: 'ACTIVE'
        }
      }
    }
  });

  // Create an Emergency Task
  const task = await prisma.task.create({
    data: {
      title: 'P3_TEST_EMERGENCY_TASK',
      description: 'Need help now',
      price: 1500,
      status: TaskStatus.OPEN,
      isEmergency: true,
      scheduledFor: new Date(),
      locationLat: 10.00,
      locationLng: 10.00,
      requesterId: requester.id,
      serviceId: service.id
    }
  });

  console.log("\\n--- 1. Testing Hard Eligibility & Fairness ---");
  const ranked = await findAndRankEligibleWorkers(task.id);
  console.log("Ranked Candidates:", ranked.length);
  ranked.forEach((c, idx) => {
    console.log(`Rank ${idx + 1}: Worker ${c.worker.profile?.fullName} (ID: ${c.workerId}) | Score: ${c.totalScore.toFixed(2)} | Reasons: ${c.reasons.join(", ")}`);
  });

  if (ranked.find(c => c.workerId === w3.id)) {
    console.error("❌ FAILED: w3 (low trust) bypassed hard eligibility!");
  } else {
    console.log("✅ Hard eligibility passed: w3 was correctly excluded.");
  }
  
  if (ranked.length > 0 && ranked[0].workerId === w1.id) {
    console.log("✅ Fairness passed: w1 outranked w2 due to w2 having high recent task value.");
  } else if (ranked.length > 0) {
    console.error("❌ FAILED: w2 outranked w1 despite having 5000 recent task value!");
  } else {
    console.error("❌ FAILED: No candidates returned.");
  }

  console.log("\\n--- 2. Testing triggerEmergencyDispatch and Notifications ---");
  await triggerEmergencyDispatch(task);
  
  const w1Notifs = await prisma.notification.findMany({ where: { userId: w1.id, relatedEntityId: task.id } });
  if (w1Notifs.length > 0) {
    console.log("✅ Notification integration passed: w1 received notification for emergency task.");
  } else {
    console.error("❌ FAILED: w1 did not receive notification.");
  }

  console.log("\\n--- 3. Testing Duplicate Assignment Protection (OCC) ---");
  const acceptTask = async (workerId: string) => {
    const freshTask = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    return prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: freshTask.id, status: TaskStatus.OPEN, version: freshTask.version },
        data: {
          taskerId: workerId,
          status: TaskStatus.ACCEPTED,
          version: { increment: 1 }
        }
      });
      return updated;
    }, { maxWait: 15000, timeout: 15000 });
  };

  try {
    await Promise.all([
      acceptTask(w1.id),
      acceptTask(w2.id)
    ]);
    console.error("❌ FAILED: Both concurrent assignments succeeded! OCC is broken.");
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.log("✅ Concurrency verification passed: OCC prevented duplicate assignment (P2025 error caught).");
    } else {
      console.error("❌ FAILED: Unexpected error during concurrency test:", error);
    }
  }

  const finalTask = await prisma.task.findUnique({ where: { id: task.id } });
  console.log(`Final Task Status: ${finalTask?.status}, Assigned Tasker: ${finalTask?.taskerId}`);
  if (finalTask?.status === TaskStatus.ACCEPTED && finalTask?.taskerId) {
     console.log("✅ Task successfully locked to one winner.");
  } else {
     console.error("❌ FAILED: Task was not correctly assigned.");
  }

  console.log("\\n--- 4. Testing Invalid Task State ---");
  try {
    await acceptTask(w2.id);
    console.error("❌ FAILED: Allowed accepting a task that is already ACCEPTED.");
  } catch (error: any) {
    if (error.code === 'P2025') {
      console.log("✅ Invalid task state verification passed: Cannot emergency-accept an already accepted task.");
    } else {
      console.error("❌ FAILED: Unexpected error during invalid state test:", error);
    }
  }

  console.log("\\n=== PHASE 3 TESTS COMPLETED ===");
}

runTests().catch(console.error).finally(() => process.exit(0));
