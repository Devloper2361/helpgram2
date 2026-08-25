-- CreateIndex
CREATE INDEX "MessageThread_requesterId_updatedAt_idx" ON "MessageThread"("requesterId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "MessageThread_taskerId_updatedAt_idx" ON "MessageThread"("taskerId", "updatedAt" DESC);
