-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'RAFFLE';

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "maxParticipants" INTEGER,
ADD COLUMN     "registrationDurationSec" INTEGER NOT NULL DEFAULT 300;
