-- AlterTable
ALTER TABLE "events" ADD COLUMN     "votingTitle" TEXT NOT NULL DEFAULT 'Encuesta',
ALTER COLUMN "suggestionMaxLength" SET DEFAULT 100;
