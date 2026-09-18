-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventStatus" ADD VALUE 'REGISTRATION_OPEN';
ALTER TYPE "EventStatus" ADD VALUE 'REGISTRATION_CLOSED';
ALTER TYPE "EventStatus" ADD VALUE 'DRAWING';

-- AlterEnum
ALTER TYPE "RoundPhase" ADD VALUE 'REGISTRATION';

-- CreateTable
CREATE TABLE "raffle_participants" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "twitchLogin" TEXT NOT NULL,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "excludedFromRedraw" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raffle_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "raffle_participants_eventId_twitchUserId_key" ON "raffle_participants"("eventId", "twitchUserId");

-- AddForeignKey
ALTER TABLE "raffle_participants" ADD CONSTRAINT "raffle_participants_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
