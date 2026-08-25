-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');

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

