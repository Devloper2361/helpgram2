import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { 
  UserRole, TaskStatus, VerificationStatus, MembershipStatus, MembershipRole
} from "../src/lib/enums.js";

const prisma = new PrismaClient();

async function main() {
  const hash = async (pw: string) => await bcrypt.hash(pw, 10);

  // 1. Cooperative Federation & Society
  const federation = await prisma.cooperativeFederation.upsert({
    where: { name: "Demo Federation" },
    update: {},
    create: {
      name: "Demo Federation",
      description: "Demo Federation for testing",
      state: "Odisha",
      status: "ACTIVE"
    }
  });

  let society = await prisma.cooperativeSociety.findFirst({
    where: { name: "Demo Society" }
  });
  if (!society) {
    society = await prisma.cooperativeSociety.create({
      data: {
        federationId: federation.id,
        name: "Demo Society",
        description: "Demo Society in Bhubaneswar",
        location: "Bhubaneswar",
        status: "ACTIVE"
      }
    });
  }

  // 2. Service Category & Services
  const skillsData = ["Cleaning", "Computer Repair", "Plumbing", "Electrical", "Delivery"];
  const skills = {};
  for (const s of skillsData) {
    const skill = await prisma.skill.upsert({
      where: { name: s },
      update: {},
      create: { name: s }
    });
    skills[s] = skill;
  }

  // Categories
  let categoryHome = await prisma.serviceCategory.findFirst({ where: { name: "Home Services", federationId: federation.id } });
  if (!categoryHome) {
    categoryHome = await prisma.serviceCategory.create({
      data: { federationId: federation.id, name: "Home Services" }
    });
  }

  let categoryTech = await prisma.serviceCategory.findFirst({ where: { name: "Tech Support", federationId: federation.id } });
  if (!categoryTech) {
    categoryTech = await prisma.serviceCategory.create({
      data: { federationId: federation.id, name: "Tech Support" }
    });
  }

  // Services
  let serviceCleaning = await prisma.service.findFirst({ where: { name: "Home Cleaning", categoryId: categoryHome.id } });
  if (!serviceCleaning) {
    serviceCleaning = await prisma.service.create({
      data: {
        categoryId: categoryHome.id,
        name: "Home Cleaning",
        description: "Basic home cleaning",
        basePrice: 500,
        status: "ACTIVE",
        skills: {
          connect: [{ id: skills["Cleaning"].id }]
        }
      }
    });
  }

  let serviceComputer = await prisma.service.findFirst({ where: { name: "Computer Setup", categoryId: categoryTech.id } });
  if (!serviceComputer) {
    serviceComputer = await prisma.service.create({
      data: {
        categoryId: categoryTech.id,
        name: "Computer Setup",
        description: "Help setting up a new computer",
        basePrice: 800,
        status: "ACTIVE",
        skills: {
          connect: [{ id: skills["Computer Repair"].id }]
        }
      }
    });
  }

  // 3. Helper function to create/update users safely
  async function upsertUser(email, password, role, fullName, trustScore, lat, lng, verificationStatus, helperSkills, balance) {
    let user = await prisma.user.findUnique({ where: { email } });
    const pwHash = await hash(password);
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: pwHash,
          role,
          profile: {
            create: {
              fullName,
              trustScore,
              locationLat: lat,
              locationLng: lng,
              isVerified: verificationStatus === VerificationStatus.VERIFIED,
              skills: {
                connect: helperSkills.map(s => ({ id: skills[s].id }))
              }
            }
          },
          wallet: {
            create: { balanceAvailable: balance }
          }
        }
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: pwHash,
          role
        }
      });
      await prisma.profile.update({
        where: { userId: user.id },
        data: {
          fullName,
          trustScore,
          locationLat: lat,
          locationLng: lng,
          isVerified: verificationStatus === VerificationStatus.VERIFIED,
          skills: {
            set: helperSkills.map(s => ({ id: skills[s].id }))
          }
        }
      });
      const wallet = await prisma.wallet.findUnique({ where: { userId: user.id }});
      if (!wallet) {
         await prisma.wallet.create({ data: { userId: user.id, balanceAvailable: balance }});
      }
    }

    // Handle KYC Verification explicitly
    if (role === UserRole.WORKER) {
      const kyc = await prisma.kYCVerification.findUnique({ where: { userId: user.id } });
      if (!kyc) {
        await prisma.kYCVerification.create({
          data: {
            userId: user.id,
            status: verificationStatus,
            verifiedAt: verificationStatus === VerificationStatus.VERIFIED ? new Date() : null
          }
        });
      } else {
        await prisma.kYCVerification.update({
          where: { userId: user.id },
          data: { status: verificationStatus, verifiedAt: verificationStatus === VerificationStatus.VERIFIED ? new Date() : null }
        });
      }

      // Handle Society Membership
      const existingMembership = await prisma.societyMembership.findFirst({
         where: { userId: user.id, societyId: society.id }
      });
      if (!existingMembership) {
        await prisma.societyMembership.create({
          data: {
            userId: user.id,
            societyId: society.id,
            role: MembershipRole.MEMBER,
            status: MembershipStatus.ACTIVE
          }
        });
      }

      // Automatically create VERIFIED certifications for demo workers' claimed skills
      if (verificationStatus === VerificationStatus.VERIFIED) {
        const currentProfile = await prisma.profile.findUnique({ where: { userId: user.id } });
        if (currentProfile) {
          for (const s of helperSkills) {
            const skillId = skills[s].id;
            const existingCert = await prisma.certification.findUnique({
              where: { profileId_skillId: { profileId: currentProfile.id, skillId } }
            });
            if (!existingCert) {
               await prisma.certification.create({
                 data: {
                   profileId: currentProfile.id,
                   skillId,
                   status: VerificationStatus.VERIFIED,
                   verifiedAt: new Date()
                 }
               });
            } else if (existingCert.status !== VerificationStatus.VERIFIED) {
               await prisma.certification.update({
                 where: { id: existingCert.id },
                 data: { status: VerificationStatus.VERIFIED, verifiedAt: new Date() }
               });
            }
          }
        }
      }
    }

    return user;
  }

  // A. Super Admin
  await upsertUser("admin@helpgram.local", "Admin@12345", UserRole.PLATFORM_ADMIN, "Super Admin", 100, null, null, VerificationStatus.VERIFIED, [], 0);

  // B. Normal Admin
  await upsertUser("moderator@helpgram.local", "Admin@12345", UserRole.FEDERATION_ADMIN, "Normal Admin", 100, null, null, VerificationStatus.VERIFIED, [], 0);

  // C. Customer
  const customer = await upsertUser("customer@helpgram.local", "Customer@12345", UserRole.CUSTOMER, "Demo Customer", 80, 20.2960, 85.8245, VerificationStatus.VERIFIED, [], 10000.0);

  // D. Helper 1 (VERIFIED, High Trust)
  const helper1 = await upsertUser("helper@helpgram.local", "Helper@12345", UserRole.WORKER, "Demo Helper", 85, 20.2970, 85.8250, VerificationStatus.VERIFIED, ["Cleaning", "Computer Repair"], 0.0);

  // E. Helper 2 (VERIFIED, High Trust)
  const helper2 = await upsertUser("helper2@helpgram.local", "Helper@12345", UserRole.WORKER, "Demo Helper Two", 75, 20.2980, 85.8260, VerificationStatus.VERIFIED, ["Plumbing", "Electrical", "Cleaning"], 0.0);

  // F. Unverified Helper (UNVERIFIED, High Trust)
  const helperUnverified = await upsertUser("helper.unverified@helpgram.local", "Helper@12345", UserRole.WORKER, "Unverified Helper", 80, 20.2950, 85.8230, VerificationStatus.UNVERIFIED, ["Cleaning"], 0.0);

  // G. Low Trust Helper (VERIFIED, Low Trust = 10)
  const helperLowTrust = await upsertUser("helper.lowtrust@helpgram.local", "Helper@12345", UserRole.WORKER, "Low Trust Helper", 10, 20.2990, 85.8270, VerificationStatus.VERIFIED, ["Delivery"], 0.0);


  // 4. Tasks (Seed if they don't exist)
  let task1 = await prisma.task.findFirst({ where: { title: "Need help with home cleaning" } });
  if (!task1) {
    task1 = await prisma.task.create({
      data: {
        requesterId: customer.id,
        serviceId: serviceCleaning.id,
        title: "Need help with home cleaning",
        description: "Need someone to clean a 2BHK apartment.",
        price: 600,
        status: TaskStatus.OPEN,
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        locationLat: 20.2960,
        locationLng: 85.8245,
        address: "Unit 4, Bhubaneswar",
      }
    });
  }

  let task2 = await prisma.task.findFirst({ where: { title: "Computer setup assistance" } });
  if (!task2) {
    task2 = await prisma.task.create({
      data: {
        requesterId: customer.id,
        serviceId: serviceComputer.id,
        title: "Computer setup assistance",
        description: "Bought a new PC, need help setting it up and installing OS.",
        price: 900,
        status: TaskStatus.OPEN,
        scheduledFor: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
        locationLat: 20.2965,
        locationLng: 85.8240,
        address: "Master Canteen, Bhubaneswar",
      }
    });
  }

  console.log("Database seeded successfully with Demo Accounts and Tasks.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
