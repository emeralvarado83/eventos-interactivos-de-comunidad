-- CreateEnum
CREATE TYPE "OptionSource" AS ENUM ('MANUAL', 'FROM_SUGGESTIONS');

-- AlterEnum
-- Los eventos GAME_SELECTION existentes se reparten según su estado: los que
-- aún no llegaron a la votación pasan a SUGGESTIONS; el resto a VOTING.
BEGIN;
CREATE TYPE "EventType_new" AS ENUM ('SUGGESTIONS', 'VOTING', 'RAFFLE');
ALTER TABLE "events" ALTER COLUMN "type" TYPE "EventType_new" USING (
  CASE
    WHEN "type"::text = 'GAME_SELECTION' AND "status" IN ('DRAFT', 'SUGGESTIONS_ACTIVE', 'SUGGESTIONS_FINISHED')
      THEN 'SUGGESTIONS'::"EventType_new"
    WHEN "type"::text = 'GAME_SELECTION'
      THEN 'VOTING'::"EventType_new"
    ELSE "type"::text::"EventType_new"
  END
);
ALTER TYPE "EventType" RENAME TO "EventType_old";
ALTER TYPE "EventType_new" RENAME TO "EventType";
DROP TYPE "public"."EventType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "voting_options" DROP CONSTRAINT "voting_options_suggestionId_fkey";

-- DropIndex
DROP INDEX "voting_options_roundId_suggestionId_key";

-- AlterTable
ALTER TABLE "events" RENAME COLUMN "maxGames" TO "maxOptions";
ALTER TABLE "events" ADD COLUMN "optionSource" "OptionSource" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "voting_options" DROP COLUMN "suggestionId";

-- CreateTable
CREATE TABLE "event_options" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_options_eventId_position_key" ON "event_options"("eventId", "position");

-- AddForeignKey
ALTER TABLE "event_options" ADD CONSTRAINT "event_options_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
