-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('HOUSEHOLD', 'INSTITUTION');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PayoutMethodType" AS ENUM ('UPI', 'BANK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';
ALTER TYPE "UserRole" ADD VALUE 'WORKER';
ALTER TYPE "UserRole" ADD VALUE 'SOCIETY_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'FEDERATION_ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'PLATFORM_ADMIN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskStatus" ADD VALUE 'ACCEPTED';
ALTER TYPE "TaskStatus" ADD VALUE 'PROOF_SUBMITTED';

-- AlterEnum
ALTER TYPE "EscrowStatus" ADD VALUE 'PARTIAL_RELEASE';

-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "customerType" "CustomerType" NOT NULL DEFAULT 'HOUSEHOLD';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "address" TEXT,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "serviceId" UUID,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "balanceAfter" DECIMAL(12,4),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "razorpayOrderId" TEXT,
ADD COLUMN     "razorpayPaymentId" TEXT,
ADD COLUMN     "razorpayPayoutId" TEXT,
ADD COLUMN     "stripeTransferId" TEXT;

-- AlterTable
ALTER TABLE "EscrowEntry" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "PayoutMethod" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" "PayoutMethodType" NOT NULL,
    "upiId" TEXT,
    "accountHolderName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLock" (
    "id" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CooperativeFederation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "state" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CooperativeFederation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CooperativeSociety" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "federationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CooperativeSociety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FederationMembership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "federationId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FederationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocietyMembership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "societyId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocietyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "federationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "basePrice" DECIMAL(12,4) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ServiceToSkill" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE INDEX "PayoutMethod_userId_idx" ON "PayoutMethod"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CooperativeFederation_name_key" ON "CooperativeFederation"("name");

-- CreateIndex
CREATE INDEX "CooperativeSociety_federationId_idx" ON "CooperativeSociety"("federationId");

-- CreateIndex
CREATE INDEX "FederationMembership_userId_idx" ON "FederationMembership"("userId");

-- CreateIndex
CREATE INDEX "FederationMembership_federationId_idx" ON "FederationMembership"("federationId");

-- CreateIndex
CREATE UNIQUE INDEX "FederationMembership_userId_federationId_key" ON "FederationMembership"("userId", "federationId");

-- CreateIndex
CREATE INDEX "SocietyMembership_userId_idx" ON "SocietyMembership"("userId");

-- CreateIndex
CREATE INDEX "SocietyMembership_societyId_idx" ON "SocietyMembership"("societyId");

-- CreateIndex
CREATE UNIQUE INDEX "SocietyMembership_userId_societyId_key" ON "SocietyMembership"("userId", "societyId");

-- CreateIndex
CREATE INDEX "ServiceCategory_federationId_idx" ON "ServiceCategory"("federationId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_federationId_name_key" ON "ServiceCategory"("federationId", "name");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_categoryId_name_key" ON "Service"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "_ServiceToSkill_AB_unique" ON "_ServiceToSkill"("A", "B");

-- CreateIndex
CREATE INDEX "_ServiceToSkill_B_index" ON "_ServiceToSkill"("B");

-- CreateIndex
CREATE INDEX "Task_serviceId_idx" ON "Task"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_stripeTransferId_key" ON "Transaction"("stripeTransferId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_razorpayOrderId_key" ON "Transaction"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_razorpayPaymentId_key" ON "Transaction"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_razorpayPayoutId_key" ON "Transaction"("razorpayPayoutId");

-- CreateIndex
CREATE INDEX "MessageThread_requesterId_updatedAt_idx" ON "MessageThread"("requesterId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "MessageThread_taskerId_updatedAt_idx" ON "MessageThread"("taskerId", "updatedAt" DESC);

-- AddForeignKey
ALTER TABLE "PayoutMethod" ADD CONSTRAINT "PayoutMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRevenue" ADD CONSTRAINT "PlatformRevenue_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CooperativeSociety" ADD CONSTRAINT "CooperativeSociety_federationId_fkey" FOREIGN KEY ("federationId") REFERENCES "CooperativeFederation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FederationMembership" ADD CONSTRAINT "FederationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FederationMembership" ADD CONSTRAINT "FederationMembership_federationId_fkey" FOREIGN KEY ("federationId") REFERENCES "CooperativeFederation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocietyMembership" ADD CONSTRAINT "SocietyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocietyMembership" ADD CONSTRAINT "SocietyMembership_societyId_fkey" FOREIGN KEY ("societyId") REFERENCES "CooperativeSociety"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_federationId_fkey" FOREIGN KEY ("federationId") REFERENCES "CooperativeFederation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceToSkill" ADD CONSTRAINT "_ServiceToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceToSkill" ADD CONSTRAINT "_ServiceToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

