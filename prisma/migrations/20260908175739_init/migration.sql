-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('GAME_SELECTION');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'SUGGESTIONS_ACTIVE', 'SUGGESTIONS_FINISHED', 'VOTING_ACTIVE', 'VOTING_FINISHED', 'TIE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RoundPhase" AS ENUM ('SUGGESTIONS', 'VOTING', 'FINISHED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "twitchId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "twitchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "suggestionDurationSec" INTEGER NOT NULL DEFAULT 60,
    "votingDurationSec" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "phase" "RoundPhase" NOT NULL,
    "phaseStartedAt" TIMESTAMP(3),
    "phaseEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestions" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "twitchLogin" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestion_bans" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggestion_bans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voting_options" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voting_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "votingOptionId" TEXT NOT NULL,
    "twitchUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_twitchId_key" ON "users"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "channels_twitchId_key" ON "channels"("twitchId");

-- CreateIndex
CREATE UNIQUE INDEX "channels_userId_key" ON "channels"("userId");

-- CreateIndex
CREATE INDEX "events_channelId_status_idx" ON "events"("channelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_eventId_number_key" ON "rounds"("eventId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "suggestions_roundId_twitchUserId_key" ON "suggestions"("roundId", "twitchUserId");

-- CreateIndex
CREATE UNIQUE INDEX "suggestions_roundId_normalizedName_key" ON "suggestions"("roundId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "suggestion_bans_roundId_normalizedName_key" ON "suggestion_bans"("roundId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "voting_options_roundId_position_key" ON "voting_options"("roundId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "voting_options_roundId_suggestionId_key" ON "voting_options"("roundId", "suggestionId");

-- CreateIndex
CREATE UNIQUE INDEX "votes_roundId_twitchUserId_key" ON "votes"("roundId", "twitchUserId");

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestion_bans" ADD CONSTRAINT "suggestion_bans_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_options" ADD CONSTRAINT "voting_options_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_options" ADD CONSTRAINT "voting_options_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "suggestions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_votingOptionId_fkey" FOREIGN KEY ("votingOptionId") REFERENCES "voting_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
