-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nickname" TEXT,
    "birthYear" INTEGER,
    "interests" TEXT[],
    "platforms" TEXT[],
    "activeHours" TEXT,
    "vibe" TEXT,
    "isAI" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gender" TEXT,
    "country" TEXT,
    "occupation" TEXT,
    "region" TEXT,
    "sightBalance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SightGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SightGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SightUse" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SightUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "worldType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "oneLiner" TEXT NOT NULL,
    "rhythm" TEXT NOT NULL,
    "speed" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,
    "recovery" TEXT NOT NULL,
    "energy" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "axisX" DOUBLE PRECISION NOT NULL,
    "axisY" DOUBLE PRECISION NOT NULL,
    "revealed" BOOLEAN NOT NULL DEFAULT false,
    "revealAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPersona" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "worldType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "oneLiner" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyPersona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campfire" (
    "id" TEXT NOT NULL,
    "worldType" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campfire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampfirePresence" (
    "id" TEXT NOT NULL,
    "campfireId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampfirePresence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampfireWhisper" (
    "id" TEXT NOT NULL,
    "campfireId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampfireWhisper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MirrorEncounter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otherUserId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "signal" TEXT,
    "signalAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MirrorEncounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResonanceNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "worldType" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResonanceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResonanceEcho" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResonanceEcho_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isAI_createdAt_idx" ON "User"("isAI", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SightGrant_userId_date_key" ON "SightGrant"("userId", "date");

-- CreateIndex
CREATE INDEX "SightUse_viewerId_createdAt_idx" ON "SightUse"("viewerId", "createdAt");

-- CreateIndex
CREATE INDEX "SightUse_targetId_status_idx" ON "SightUse"("targetId", "status");

-- CreateIndex
CREATE INDEX "Persona_userId_idx" ON "Persona"("userId");

-- CreateIndex
CREATE INDEX "DailyPersona_userId_idx" ON "DailyPersona"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyPersona_userId_date_key" ON "DailyPersona"("userId", "date");

-- CreateIndex
CREATE INDEX "Campfire_date_idx" ON "Campfire"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Campfire_worldType_date_key" ON "Campfire"("worldType", "date");

-- CreateIndex
CREATE INDEX "CampfirePresence_campfireId_idx" ON "CampfirePresence"("campfireId");

-- CreateIndex
CREATE UNIQUE INDEX "CampfirePresence_campfireId_userId_key" ON "CampfirePresence"("campfireId", "userId");

-- CreateIndex
CREATE INDEX "CampfireWhisper_campfireId_idx" ON "CampfireWhisper"("campfireId");

-- CreateIndex
CREATE INDEX "MirrorEncounter_userId_idx" ON "MirrorEncounter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MirrorEncounter_userId_date_key" ON "MirrorEncounter"("userId", "date");

-- CreateIndex
CREATE INDEX "ResonanceNote_date_idx" ON "ResonanceNote"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ResonanceNote_userId_date_key" ON "ResonanceNote"("userId", "date");

-- CreateIndex
CREATE INDEX "ResonanceEcho_userId_idx" ON "ResonanceEcho"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ResonanceEcho_noteId_userId_key" ON "ResonanceEcho"("noteId", "userId");

-- AddForeignKey
ALTER TABLE "SightGrant" ADD CONSTRAINT "SightGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SightUse" ADD CONSTRAINT "SightUse_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SightUse" ADD CONSTRAINT "SightUse_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Persona" ADD CONSTRAINT "Persona_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPersona" ADD CONSTRAINT "DailyPersona_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampfirePresence" ADD CONSTRAINT "CampfirePresence_campfireId_fkey" FOREIGN KEY ("campfireId") REFERENCES "Campfire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampfirePresence" ADD CONSTRAINT "CampfirePresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampfireWhisper" ADD CONSTRAINT "CampfireWhisper_campfireId_fkey" FOREIGN KEY ("campfireId") REFERENCES "Campfire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampfireWhisper" ADD CONSTRAINT "CampfireWhisper_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MirrorEncounter" ADD CONSTRAINT "MirrorEncounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MirrorEncounter" ADD CONSTRAINT "MirrorEncounter_otherUserId_fkey" FOREIGN KEY ("otherUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResonanceNote" ADD CONSTRAINT "ResonanceNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResonanceEcho" ADD CONSTRAINT "ResonanceEcho_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "ResonanceNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResonanceEcho" ADD CONSTRAINT "ResonanceEcho_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

