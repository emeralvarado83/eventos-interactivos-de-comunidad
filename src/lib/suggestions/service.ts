// Reglas de sugerencias (Fase 6): normalización, validación de texto, alta
// desde el chat y veto desde el dashboard. En SUGGESTIONS_ACTIVE cualquier
// mensaje válido es una sugerencia; los rechazos (duplicado, veto previo,
// fase incorrecta) son SILENCIOSOS: nunca se responde al chat.

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BusinessError } from "@/lib/errors";
import { SOCKET_EVENTS, type SuggestionView } from "@/lib/realtime/contracts";
import { publishEventState } from "@/lib/events/service";

const MIN_LENGTH = 2;
const MAX_LENGTH = 60;

/** Normalización para deduplicar: lowercase + trim + colapsar espacios. */
export function normalizeGameName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Texto válido como sugerencia: tras trim, entre 2 y 60 caracteres. */
export function isValidSuggestionText(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= MIN_LENGTH && trimmed.length <= MAX_LENGTH;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

export type AddSuggestionResult = "added" | "ignored";

/**
 * Registra una sugerencia en la ronda. Devuelve "ignored" (sin lanzar) para
 * todos los rechazos silenciosos: texto inválido, fase incorrecta, nombre
 * vetado o duplicado (mismo usuario o mismo nombre normalizado, P2002).
 */
export async function addSuggestion(
  roundId: string,
  twitchUserId: string,
  twitchLogin: string,
  gameName: string
): Promise<AddSuggestionResult> {
  if (!isValidSuggestionText(gameName)) return "ignored";

  const round = await db.round.findUnique({
    where: { id: roundId },
    include: { event: true },
  });
  if (
    !round ||
    round.phase !== "SUGGESTIONS" ||
    round.event.status !== "SUGGESTIONS_ACTIVE"
  ) {
    return "ignored";
  }

  const normalizedName = normalizeGameName(gameName);
  const banned = await db.suggestionBan.findUnique({
    where: { roundId_normalizedName: { roundId, normalizedName } },
  });
  if (banned) return "ignored";

  let suggestion;
  try {
    suggestion = await db.suggestion.create({
      data: {
        roundId,
        twitchUserId,
        twitchLogin,
        gameName: gameName.trim(),
        normalizedName,
      },
    });
  } catch (err) {
    // Duplicado por (roundId, twitchUserId) o (roundId, normalizedName).
    if (isUniqueViolation(err)) return "ignored";
    throw err;
  }

  const view: SuggestionView = {
    id: suggestion.id,
    gameName: suggestion.gameName,
    twitchLogin: suggestion.twitchLogin,
    createdAt: suggestion.createdAt.toISOString(),
  };
  await publishEventState(round.event.channelId, {
    event: SOCKET_EVENTS.SUGGESTION_ADDED,
    payload: view,
  });
  return "added";
}

/**
 * Veto desde el dashboard: borra la sugerencia y crea el SuggestionBan de la
 * ronda en una transacción. Prohibido una vez iniciada la votación (la
 * sugerencia ya quedó fijada como VotingOption).
 */
export async function removeAndBanSuggestion(
  suggestionId: string
): Promise<void> {
  const suggestion = await db.suggestion.findUnique({
    where: { id: suggestionId },
    include: { round: { include: { event: true } } },
  });
  if (!suggestion) throw new BusinessError("Sugerencia no encontrada");
  if (suggestion.round.phase !== "SUGGESTIONS") {
    throw new BusinessError(
      "No se puede vetar una sugerencia una vez iniciada la votación"
    );
  }

  await db.$transaction([
    db.suggestion.delete({ where: { id: suggestion.id } }),
    db.suggestionBan.create({
      data: {
        roundId: suggestion.roundId,
        normalizedName: suggestion.normalizedName,
      },
    }),
  ]);

  await publishEventState(suggestion.round.event.channelId, {
    event: SOCKET_EVENTS.SUGGESTION_REMOVED,
    payload: { suggestionId: suggestion.id },
  });
}
