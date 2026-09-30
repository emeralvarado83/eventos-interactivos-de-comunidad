-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "alertSoundEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "subsOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "themeColor" TEXT NOT NULL DEFAULT 'violet';

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "igdbValidation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "raffleCommand" TEXT NOT NULL DEFAULT 'participo',
ADD COLUMN     "suggestionMaxLength" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "suggestionTitle" TEXT NOT NULL DEFAULT '¿Qué jugamos?';
