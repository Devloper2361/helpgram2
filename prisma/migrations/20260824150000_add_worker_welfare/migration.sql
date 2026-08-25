-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "WorkerWelfareProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workerId" UUID NOT NULL,
    "isCovered" BOOLEAN NOT NULL DEFAULT false,
    "coverageType" TEXT,
    "coverageAmount" DECIMAL(12,4),
    "validUntil" TIMESTAMP(3),
    "policyNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkerWelfareProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WelfareClaim" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "incidentDate" TIMESTAMP(3),
    "supportingDocumentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WelfareClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkerWelfareProfile_workerId_key" ON "WorkerWelfareProfile"("workerId");

-- AddForeignKey
ALTER TABLE "WorkerWelfareProfile" ADD CONSTRAINT "WorkerWelfareProfile_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WelfareClaim" ADD CONSTRAINT "WelfareClaim_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
