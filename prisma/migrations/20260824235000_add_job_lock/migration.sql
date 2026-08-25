CREATE TABLE "JobLock" (
    "id" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobLock_pkey" PRIMARY KEY ("id")
);
