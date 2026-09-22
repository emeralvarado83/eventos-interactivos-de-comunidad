// Reglas de sugerencias (Fase 6): normalización, validación de texto,
// validación contra el catálogo IGDB (canoniza typos, rechaza basura,
// fail-open si IGDB cae), alta desde el chat y veto desde el dashboard.
// En SUGGESTIONS_ACTIVE cualquier mensaje válido es una sugerencia; los
// rechazos (duplicado, veto previo, fase incorrecta, juego no encontrado)
// son SILENCIOSOS: nunca se responde al chat.

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { BusinessError } from "@/lib/errors";
import { resolveGameName } from "@/lib/igdb/games";
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
 * vetado, duplicado (mismo usuario o mismo nombre normalizado, P2002) o
 * texto que no corresponde a ningún juego del catálogo IGDB.
 *
 * Validación IGDB: el texto se resuelve contra el catálogo y, si hay match,
 * se guarda el título OFICIAL (canoniza typos; además los typos de distintos
 * usuarios deduplican solos al compartir nombre normalizado canónico y el
 * veto cubre todas las grafías). Si IGDB no encuentra nada parecido, se
 * rechaza silenciosamente. Si IGDB FALLA (timeout, red, 5xx), se acepta el
 * texto del usuario tal cual: fail-open, el evento nunca depende de IGDB.
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

  let finalGameName = gameName.trim();
  let igdbGameId: number | null = null;
  if (config.igdbValidationEnabled) {
    try {
      const match = await resolveGameName(gameName);
      if (!match) return "ignored";
      finalGameName = match.officialName;
      igdbGameId = match.igdbGameId;
    } catch (err) {
      console.error(
        "IGDB no disponible; se acepta la sugerencia sin validar:",
        err
      );
    }
  }

  const normalizedName = normalizeGameName(finalGameName);
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
        gameName: finalGameName,
        normalizedName,
        igdbGameId,
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
 * ronda en una transacción. Prohibido fuera de la fase de sugerencias.
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
