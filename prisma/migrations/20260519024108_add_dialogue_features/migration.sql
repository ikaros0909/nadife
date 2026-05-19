-- CreateTable
CREATE TABLE "LetterThread" (
    "id" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "letterCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLetterAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "LetterThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Letter" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isAI" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Letter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoincidenceMeeting" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "windowTime" TEXT NOT NULL,
    "aliceId" TEXT NOT NULL,
    "bobId" TEXT NOT NULL,
    "aliceAlias" TEXT NOT NULL,
    "bobAlias" TEXT NOT NULL,
    "aliceLine" TEXT,
    "bobLine" TEXT,
    "aliceAt" TIMESTAMP(3),
    "bobAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sealedAt" TIMESTAMP(3),

    CONSTRAINT "CoincidenceMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuetBook" (
    "id" TEXT NOT NULL,
    "authorAId" TEXT NOT NULL,
    "authorBId" TEXT NOT NULL,
    "themes" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DuetBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuetLine" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "themeIdx" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DuetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Postbox" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "starredReplyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Postbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostboxReply" (
    "id" TEXT NOT NULL,
    "postboxId" TEXT NOT NULL,
    "replierId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostboxReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LetterThread_initiatorId_idx" ON "LetterThread"("initiatorId");

-- CreateIndex
CREATE INDEX "LetterThread_receiverId_idx" ON "LetterThread"("receiverId");

-- CreateIndex
CREATE INDEX "LetterThread_status_lastLetterAt_idx" ON "LetterThread"("status", "lastLetterAt");

-- CreateIndex
CREATE INDEX "Letter_threadId_createdAt_idx" ON "Letter"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "CoincidenceMeeting_aliceId_idx" ON "CoincidenceMeeting"("aliceId");

-- CreateIndex
CREATE INDEX "CoincidenceMeeting_bobId_idx" ON "CoincidenceMeeting"("bobId");

-- CreateIndex
CREATE UNIQUE INDEX "CoincidenceMeeting_date_windowTime_aliceId_key" ON "CoincidenceMeeting"("date", "windowTime", "aliceId");

-- CreateIndex
CREATE UNIQUE INDEX "CoincidenceMeeting_date_windowTime_bobId_key" ON "CoincidenceMeeting"("date", "windowTime", "bobId");

-- CreateIndex
CREATE INDEX "DuetBook_authorAId_idx" ON "DuetBook"("authorAId");

-- CreateIndex
CREATE INDEX "DuetBook_authorBId_idx" ON "DuetBook"("authorBId");

-- CreateIndex
CREATE UNIQUE INDEX "DuetBook_authorAId_authorBId_key" ON "DuetBook"("authorAId", "authorBId");

-- CreateIndex
CREATE INDEX "DuetLine_bookId_idx" ON "DuetLine"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "DuetLine_bookId_authorId_themeIdx_key" ON "DuetLine"("bookId", "authorId", "themeIdx");

-- CreateIndex
CREATE UNIQUE INDEX "Postbox_starredReplyId_key" ON "Postbox"("starredReplyId");

-- CreateIndex
CREATE INDEX "Postbox_weekKey_createdAt_idx" ON "Postbox"("weekKey", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Postbox_authorId_weekKey_key" ON "Postbox"("authorId", "weekKey");

-- CreateIndex
CREATE INDEX "PostboxReply_postboxId_createdAt_idx" ON "PostboxReply"("postboxId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostboxReply_postboxId_replierId_key" ON "PostboxReply"("postboxId", "replierId");

-- AddForeignKey
ALTER TABLE "LetterThread" ADD CONSTRAINT "LetterThread_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LetterThread" ADD CONSTRAINT "LetterThread_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "LetterThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Letter" ADD CONSTRAINT "Letter_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoincidenceMeeting" ADD CONSTRAINT "CoincidenceMeeting_aliceId_fkey" FOREIGN KEY ("aliceId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoincidenceMeeting" ADD CONSTRAINT "CoincidenceMeeting_bobId_fkey" FOREIGN KEY ("bobId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuetBook" ADD CONSTRAINT "DuetBook_authorAId_fkey" FOREIGN KEY ("authorAId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuetBook" ADD CONSTRAINT "DuetBook_authorBId_fkey" FOREIGN KEY ("authorBId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuetLine" ADD CONSTRAINT "DuetLine_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "DuetBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuetLine" ADD CONSTRAINT "DuetLine_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Postbox" ADD CONSTRAINT "Postbox_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostboxReply" ADD CONSTRAINT "PostboxReply_postboxId_fkey" FOREIGN KEY ("postboxId") REFERENCES "Postbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostboxReply" ADD CONSTRAINT "PostboxReply_replierId_fkey" FOREIGN KEY ("replierId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
