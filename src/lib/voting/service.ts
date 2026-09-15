// Reglas de votación (Fase 6): alta de votos desde el chat y funciones PURAS
// de ranking y resultado (testeadas sin DB). Las posiciones son estables: el
// voto guarda el votingOptionId real, no la posición. Los rechazos (fase
// incorrecta, posición fuera de rango, voto repetido) son silenciosos.

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { SOCKET_EVENTS } from "@/lib/realtime/contracts";

export interface RankableOption {
  position: number;
  gameName: string;
  votes: number;
}

/** Ranking visual: votos descendientes; desempate por posición ascendente. */
export function computeRanking<T extends RankableOption>(options: T[]): T[] {
  return [...options].sort(
    (a, b) => b.votes - a.votes || a.position - b.position
  );
}

export type VoteOutcome =
  | { type: "winner"; winner: RankableOption }
  | { type: "tie"; tiedPositions: number[] };

/**
 * Resultado de una votación cerrada: ganadora única o empate en cabeza
 * (2+ opciones con los mismos votos, incluido el empate a 0). Con una sola
 * opción siempre hay ganadora. Las posiciones empatadas van ordenadas asc.
 */
export function resolveOutcome(options: RankableOption[]): VoteOutcome {
  if (options.length === 0) {
    throw new Error("resolveOutcome requiere al menos una opción");
  }
  const [leader] = computeRanking(options);
  const tied = options.filter((o) => o.votes === leader.votes);
  if (tied.length === 1) {
    return { type: "winner", winner: leader };
  }
  return {
    type: "tie",
    tiedPositions: tied.map((o) => o.position).sort((a, b) => a - b),
  };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

export type AddVoteResult = "added" | "ignored";

/**
 * Registra un voto por posición estable. Devuelve "ignored" (sin lanzar) si
 * la fase no es VOTING_ACTIVE, la posición está fuera de [1, n] o el usuario
 * ya votó en la ronda (constraint única → P2002).
 */
export async function addVote(
  roundId: string,
  twitchUserId: string,
  position: number
): Promise<AddVoteResult> {
  if (!Number.isInteger(position) || position < 1) return "ignored";

  const round = await db.round.findUnique({
    where: { id: roundId },
    include: { event: true },
  });
  if (
    !round ||
    round.phase !== "VOTING" ||
    round.event.status !== "VOTING_ACTIVE"
  ) {
    return "ignored";
  }

  const option = await db.votingOption.findUnique({
    where: { roundId_position: { roundId, position } },
  });
  if (!option) return "ignored";

  try {
    await db.vote.create({
      data: { roundId, votingOptionId: option.id, twitchUserId },
    });
  } catch (err) {
    // El usuario ya votó en esta ronda.
    if (isUniqueViolation(err)) return "ignored";
    throw err;
  }

  // Import perezoso: evita el ciclo events/service → voting/service.
  const { publishEventState } = await import("@/lib/events/service");
  await publishEventState(round.event.channelId, {
    event: SOCKET_EVENTS.VOTE_UPDATED,
    payload: { channelId: round.event.channelId },
  });
  return "added";
}
