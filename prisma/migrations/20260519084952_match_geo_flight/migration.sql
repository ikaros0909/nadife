-- AlterTable
ALTER TABLE "Letter" ADD COLUMN     "arrivesAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "LetterThread" ADD COLUMN     "unlimited" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "connectAgeMax" INTEGER,
ADD COLUMN     "connectAgeMin" INTEGER,
ADD COLUMN     "connectCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "connectGenders" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "connectRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "geoLat" DOUBLE PRECISION,
ADD COLUMN     "geoLng" DOUBLE PRECISION,
ADD COLUMN     "geoOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "geoUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Letter_threadId_arrivesAt_idx" ON "Letter"("threadId", "arrivesAt");
