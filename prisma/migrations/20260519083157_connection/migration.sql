-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED_A',
    "proposerId" TEXT,
    "proposedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declinedById" TEXT,
    "disconnectedAt" TIMESTAMP(3),
    "disconnectedById" TEXT,
    "blockedAt" TIMESTAMP(3),
    "blockedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Connection_userAId_idx" ON "Connection"("userAId");

-- CreateIndex
CREATE INDEX "Connection_userBId_idx" ON "Connection"("userBId");

-- CreateIndex
CREATE INDEX "Connection_status_idx" ON "Connection"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_userAId_userBId_key" ON "Connection"("userAId", "userBId");

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
