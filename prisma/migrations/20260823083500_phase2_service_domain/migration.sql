-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('HOUSEHOLD', 'INSTITUTION');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "customerType" "CustomerType" NOT NULL DEFAULT 'HOUSEHOLD';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "serviceId" UUID;

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
CREATE UNIQUE INDEX "_ServiceToSkill_AB_unique" ON "_ServiceToSkill"("A", "B");

-- CreateIndex
CREATE INDEX "_ServiceToSkill_B_index" ON "_ServiceToSkill"("B");

-- CreateIndex
CREATE INDEX "ServiceCategory_federationId_idx" ON "ServiceCategory"("federationId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_federationId_name_key" ON "ServiceCategory"("federationId", "name");

-- CreateIndex
CREATE INDEX "Service_categoryId_idx" ON "Service"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_categoryId_name_key" ON "Service"("categoryId", "name");

-- CreateIndex
CREATE INDEX "Task_serviceId_idx" ON "Task"("serviceId");

-- AddForeignKey
ALTER TABLE "ServiceCategory" ADD CONSTRAINT "ServiceCategory_federationId_fkey" FOREIGN KEY ("federationId") REFERENCES "CooperativeFederation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceToSkill" ADD CONSTRAINT "_ServiceToSkill_A_fkey" FOREIGN KEY ("A") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ServiceToSkill" ADD CONSTRAINT "_ServiceToSkill_B_fkey" FOREIGN KEY ("B") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
