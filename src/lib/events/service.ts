// Servicio de eventos y rondas (Fases 5 y 7): ciclo de vida completo del
// evento, cálculo del snapshot público y orquestación de timers y emisiones
// en tiempo real tras cada mutación.

import { db } from "@/lib/db";
import { BusinessError } from "@/lib/errors";
import { assertTransition } from "@/lib/events/state-machine";
import type { EventConfigInput } from "@/lib/events/config";
import {
  SOCKET_EVENTS,
  type EventStateSnapshot,
  type EventStatusName,
  type EventTypeName,
} from "@/lib/realtime/contracts";
import { emitState, emitToChannel } from "@/lib/realtime/server";
import { clearPhaseTimer, schedulePhaseTimer } from "@/lib/timers";
import { computeRanking, resolveOutcome } from "@/lib/voting/service";

const EXTEND_VOTING_SEC = 60; // extensión fija de la votación tras un empate
const MIN_DURATION_SEC = 10;
const MAX_DURATION_SEC = 3600;
const MIN_MAX_GAMES = 1;
const MAX_MAX_GAMES = 50;
const DEFAULT_MAX_GAMES = 10;
const MIN_MAX_PARTICIPANTS = 1;
const MAX_MAX_PARTICIPANTS = 10000;
const DEFAULT_REGISTRATION_SEC = 300;

// Estados en los que un evento ya no admite actividad pero COMPLETED sigue
// siendo "visible" como evento actual del canal (muestra el ganador).
const TERMINAL_STATUSES: readonly EventStatusName[] = ["COMPLETED", "CANCELLED"];

function validDuration(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_DURATION_SEC &&
    value <= MAX_DURATION_SEC
  );
}

function validMaxGames(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_MAX_GAMES &&
    value <= MAX_MAX_GAMES
  );
}

function validMaxParticipants(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_MAX_PARTICIPANTS &&
    value <= MAX_MAX_PARTICIPANTS
  );
}

/** Config de Sugerencias y votos (GAME_SELECTION), completa y válida. */
function assertValidSuggestionsConfig(config: {
  suggestionDurationSec: number;
  votingDurationSec: number;
  maxGames: number;
}): void {
  if (
    !validDuration(config.suggestionDurationSec) ||
    !validDuration(config.votingDurationSec)
  ) {
    throw new BusinessError(
      `Las duraciones deben ser enteros entre ${MIN_DURATION_SEC} y ${MAX_DURATION_SEC} segundos`
    );
  }
  if (!validMaxGames(config.maxGames)) {
    throw new BusinessError(
      `El máximo de juegos debe ser un entero entre ${MIN_MAX_GAMES} y ${MAX_MAX_GAMES}`
    );
  }
}

/** Config del sorteo (RAFFLE), completa y válida. */
function assertValidRaffleConfig(config: {
  registrationDurationSec: number;
  maxParticipants: number | null;
}): void {
  if (!validDuration(config.registrationDurationSec)) {
    throw new BusinessError(
      `La duración de la inscripción debe ser un entero entre ${MIN_DURATION_SEC} y ${MAX_DURATION_SEC} segundos`
    );
  }
  if (
    config.maxParticipants !== null &&
    !validMaxParticipants(config.maxParticipants)
  ) {
    throw new BusinessError(
      `El máximo de participantes debe ser un entero entre ${MIN_MAX_PARTICIPANTS} y ${MAX_MAX_PARTICIPANTS}, o null (sin límite)`
    );
  }
}

/** Recalcula el snapshot del canal y lo emite junto al evento específico opcional. */
export async function publishEventState(
  channelId: string,
  specificEvent?: { event: string; payload: unknown }
): Promise<void> {
  try {
    const snapshot = await getCurrentSnapshot(channelId);
    emitState(channelId, snapshot);
    if (specificEvent) {
      emitToChannel(channelId, specificEvent.event, specificEvent.payload);
    }
  } catch (err) {
    console.error("Error al emitir el estado del canal:", err);
  }
}

export async function createEvent(
  channelId: string,
  options: {
    type?: EventTypeName;
    suggestionDurationSec?: number;
    votingDurationSec?: number;
    maxGames?: number;
    registrationDurationSec?: number;
    maxParticipants?: number | null;
  } = {}
) {
  const type = options.type ?? "GAME_SELECTION";
  const suggestionDurationSec = options.suggestionDurationSec ?? 60;
  const votingDurationSec = options.votingDurationSec ?? 60;
  const maxGames = options.maxGames ?? DEFAULT_MAX_GAMES;
  const registrationDurationSec =
    options.registrationDurationSec ?? DEFAULT_REGISTRATION_SEC;
  const maxParticipants = options.maxParticipants ?? null;

  if (type === "RAFFLE") {
    assertValidRaffleConfig({ registrationDurationSec, maxParticipants });
  } else {
    assertValidSuggestionsConfig({
      suggestionDurationSec,
      votingDurationSec,
      maxGames,
    });
  }

  const active = await db.event.findFirst({
    where: { channelId, status: { notIn: [...TERMINAL_STATUSES] } },
  });
  if (active) {
    throw new BusinessError("Ya hay un evento activo en este canal");
  }

  return db.event.create({
    data: {
      channelId,
      type,
      suggestionDurationSec,
      votingDurationSec,
      maxGames,
      registrationDurationSec,
      maxParticipants,
      rounds: { create: { number: 1, phase: "SUGGESTIONS" } },
    },
    include: { rounds: true },
  });
}

/**
 * Edición de la configuración del evento, consciente del tipo: actualiza
 * `type` y los campos propios de ese tipo. La configuración de otros tipos
 * se conserva intacta en sus columnas. Solo permitida en DRAFT, antes de
 * que arranque la primera fase.
 */
export async function updateEventConfig(
  eventId: string,
  config: EventConfigInput
): Promise<void> {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new BusinessError("Evento no encontrado");
  if (event.status !== "DRAFT") {
    throw new BusinessError(
      "La configuración solo puede editarse antes de iniciar el evento"
    );
  }

  const type = config.type ?? event.type;

  if (type === "RAFFLE") {
    if (
      config.registrationDurationSec === undefined ||
      config.maxParticipants === undefined
    ) {
      throw new BusinessError(
        "El body debe incluir registrationDurationSec y maxParticipants"
      );
    }
    assertValidRaffleConfig({
      registrationDurationSec: config.registrationDurationSec,
      maxParticipants: config.maxParticipants,
    });
    await db.event.update({
      where: { id: event.id },
      data: {
        type,
        registrationDurationSec: config.registrationDurationSec,
        maxParticipants: config.maxParticipants,
      },
    });
  } else {
    if (
      config.suggestionDurationSec === undefined ||
      config.votingDurationSec === undefined ||
      config.maxGames === undefined
    ) {
      throw new BusinessError(
        "El body debe incluir suggestionDurationSec, votingDurationSec y maxGames"
      );
    }
    assertValidSuggestionsConfig({
      suggestionDurationSec: config.suggestionDurationSec,
      votingDurationSec: config.votingDurationSec,
      maxGames: config.maxGames,
    });
    await db.event.update({
      where: { id: event.id },
      data: {
        type,
        suggestionDurationSec: config.suggestionDurationSec,
        votingDurationSec: config.votingDurationSec,
        maxGames: config.maxGames,
      },
    });
  }
  await publishEventState(event.channelId);
}

export async function getEventById(eventId: string) {
  return db.event.findUnique({ where: { id: eventId } });
}

/** Snapshot completo del evento actual del canal (último no cancelado). */
export async function getCurrentSnapshot(
  channelId: string
): Promise<EventStateSnapshot> {
  const empty: EventStateSnapshot = {
    channelId,
    event: null,
    round: null,
    suggestions: [],
    votingOptions: [],
    tiedPositions: [],
    winner: null,
  };

  const event = await db.event.findFirst({
    where: { channelId, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    include: {
      rounds: {
        orderBy: { number: "desc" },
        take: 1,
        include: {
          suggestions: { orderBy: { createdAt: "asc" } },
          votingOptions: { include: { _count: { select: { votes: true } } } },
        },
      },
    },
  });
  if (!event) return empty;

  const round = event.rounds[0] ?? null;
  const ranked = round
    ? computeRanking(
        round.votingOptions.map((o) => ({
          position: o.position,
          gameName: o.gameName,
          votes: o._count.votes,
        }))
      )
    : [];

  let tiedPositions: number[] = [];
  let winner: EventStateSnapshot["winner"] = null;
  if (ranked.length > 0) {
    if (event.status === "TIE") {
      const outcome = resolveOutcome(ranked);
      if (outcome.type === "tie") tiedPositions = outcome.tiedPositions;
    } else if (event.status === "COMPLETED") {
      const outcome = resolveOutcome(ranked);
      if (outcome.type === "winner") winner = outcome.winner;
    }
  }

  return {
    channelId,
    event: {
      id: event.id,
      type: event.type,
      status: event.status,
      suggestionDurationSec: event.suggestionDurationSec,
      votingDurationSec: event.votingDurationSec,
      maxGames: event.maxGames,
      registrationDurationSec: event.registrationDurationSec,
      maxParticipants: event.maxParticipants,
    },
    round: round
      ? {
          id: round.id,
          number: round.number,
          phase: round.phase,
          phaseStartedAt: round.phaseStartedAt?.toISOString() ?? null,
          phaseEndsAt: round.phaseEndsAt?.toISOString() ?? null,
        }
      : null,
    suggestions:
      round?.suggestions.map((s) => ({
        id: s.id,
        gameName: s.gameName,
        twitchLogin: s.twitchLogin,
        createdAt: s.createdAt.toISOString(),
      })) ?? [],
    votingOptions: ranked.map((o) => {
      const option = round!.votingOptions.find((v) => v.position === o.position)!;
      return { id: option.id, ...o };
    }),
    tiedPositions,
    winner,
  };
}

/** Carga el evento con su ronda actual o lanza BusinessError si no existe. */
async function getEventWithCurrentRound(eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: {
      rounds: {
        orderBy: { number: "desc" },
        take: 1,
        include: { suggestions: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!event) throw new BusinessError("Evento no encontrado");
  const round = event.rounds[0];
  if (!round) throw new BusinessError("El evento no tiene ninguna ronda");
  return { event, round };
}

function programPhaseTimer(eventId: string, endsAt: Date): void {
  schedulePhaseTimer(eventId, endsAt, () => handlePhaseExpiry(eventId));
}

/** DRAFT → SUGGESTIONS_ACTIVE: arranca la fase de sugerencias de la ronda 1. */
export async function startSuggestions(eventId: string): Promise<void> {
  const { event, round } = await getEventWithCurrentRound(eventId);
  assertTransition(event.status, "SUGGESTIONS_ACTIVE");

  const now = new Date();
  const endsAt = new Date(now.getTime() + event.suggestionDurationSec * 1000);
  await db.$transaction([
    db.event.update({
      where: { id: event.id },
      data: { status: "SUGGESTIONS_ACTIVE", startedAt: event.startedAt ?? now },
    }),
    db.round.update({
      where: { id: round.id },
      data: { phase: "SUGGESTIONS", phaseStartedAt: now, phaseEndsAt: endsAt },
    }),
  ]);
  programPhaseTimer(event.id, endsAt);
  await publishEventState(event.channelId);
}

/**
 * SUGGESTIONS_ACTIVE → SUGGESTIONS_FINISHED. Si la expiración es automática
 * y no llegó ninguna sugerencia, el evento se cancela solo.
 */
export async function finishSuggestions(
  eventId: string,
  options: { automatic?: boolean } = {}
): Promise<void> {
  const { event, round } = await getEventWithCurrentRound(eventId);

  if (options.automatic) {
    // El timer solo actúa si la fase sigue activa: un cierre manual
    // concurrente invalida la expiración.
    if (event.status !== "SUGGESTIONS_ACTIVE") return;
    if (round.suggestions.length === 0) {
      clearPhaseTimer(event.id);
      await db.$transaction([
        db.event.update({
          where: { id: event.id },
          data: { status: "CANCELLED", endedAt: new Date() },
        }),
        db.round.update({
          where: { id: round.id },
          data: { phaseEndsAt: null },
        }),
      ]);
      await publishEventState(event.channelId, {
        event: SOCKET_EVENTS.CANCELLED,
        payload: { channelId: event.channelId },
      });
      return;
    }
  }

  assertTransition(event.status, "SUGGESTIONS_FINISHED");
  clearPhaseTimer(event.id);
  await db.$transaction([
    db.event.update({
      where: { id: event.id },
      data: { status: "SUGGESTIONS_FINISHED" },
    }),
    db.round.update({ where: { id: round.id }, data: { phaseEndsAt: null } }),
  ]);
  await publishEventState(event.channelId);
}

/**
 * SUGGESTIONS_FINISHED → VOTING_ACTIVE: fija las VotingOption con posiciones
 * estables 1..n a partir de las sugerencias en orden de llegada, limitadas a
 * `event.maxGames`.
 */
export async function startVoting(eventId: string): Promise<void> {
  const { event, round } = await getEventWithCurrentRound(eventId);
  assertTransition(event.status, "VOTING_ACTIVE");
  if (round.suggestions.length === 0) {
    throw new BusinessError("No se puede iniciar la votación sin sugerencias");
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + event.votingDurationSec * 1000);
  const options = round.suggestions.slice(0, event.maxGames);
  await db.$transaction([
    db.votingOption.createMany({
      data: options.map((s, i) => ({
        roundId: round.id,
        position: i + 1,
        suggestionId: s.id,
        gameName: s.gameName,
      })),
    }),
    db.round.update({
      where: { id: round.id },
      data: { phase: "VOTING", phaseStartedAt: now, phaseEndsAt: endsAt },
    }),
    db.event.update({
      where: { id: event.id },
      data: { status: "VOTING_ACTIVE" },
    }),
  ]);
  programPhaseTimer(event.id, endsAt);
  await publishEventState(event.channelId);
}

/**
 * VOTING_ACTIVE → VOTING_FINISHED → COMPLETED | TIE, todo en una transacción.
 * Empate: las 2+ opciones de cabeza con los mismos votos (incluido 0-0 si hay
 * más de una opción). Con una sola opción siempre hay ganadora, incluso a 0.
 */
export async function finishVoting(eventId: string): Promise<void> {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new BusinessError("Evento no encontrado");

  const outcome = await db.$transaction(async (tx) => {
    const current = await tx.event.findUniqueOrThrow({
      where: { id: eventId },
      include: {
        rounds: {
          orderBy: { number: "desc" },
          take: 1,
          include: {
            votingOptions: { include: { _count: { select: { votes: true } } } },
          },
        },
      },
    });
    const round = current.rounds[0];
    if (!round) throw new BusinessError("El evento no tiene ninguna ronda");

    // Se validan ambos pasos de la máquina de estados aunque en DB solo se
    // persiste el estado final.
    assertTransition(current.status, "VOTING_FINISHED");
    const result = resolveOutcome(
      round.votingOptions.map((o) => ({
        position: o.position,
        gameName: o.gameName,
        votes: o._count.votes,
      }))
    );
    const finalStatus: EventStatusName =
      result.type === "tie" ? "TIE" : "COMPLETED";
    assertTransition("VOTING_FINISHED", finalStatus);

    await tx.event.update({
      where: { id: eventId },
      data: {
        status: finalStatus,
        endedAt: finalStatus === "COMPLETED" ? new Date() : null,
      },
    });
    await tx.round.update({
      where: { id: round.id },
      data: { phase: "FINISHED", phaseEndsAt: null },
    });
    return result;
  });

  clearPhaseTimer(eventId);
  await publishEventState(
    event.channelId,
    outcome.type === "tie"
      ? {
          event: SOCKET_EVENTS.TIE,
          payload: { channelId: event.channelId, tiedPositions: outcome.tiedPositions },
        }
      : {
          event: SOCKET_EVENTS.COMPLETED,
          payload: { channelId: event.channelId, winner: outcome.winner },
        }
  );
}

/** TIE → VOTING_ACTIVE: +60s conservando votos (quien ya votó no re-vota). */
export async function extendVoting(eventId: string): Promise<void> {
  const { event, round } = await getEventWithCurrentRound(eventId);
  assertTransition(event.status, "VOTING_ACTIVE");

  const now = new Date();
  const endsAt = new Date(now.getTime() + EXTEND_VOTING_SEC * 1000);
  await db.$transaction([
    db.event.update({
      where: { id: event.id },
      data: { status: "VOTING_ACTIVE", endedAt: null },
    }),
    db.round.update({
      where: { id: round.id },
      data: { phase: "VOTING", phaseStartedAt: now, phaseEndsAt: endsAt },
    }),
  ]);
  programPhaseTimer(event.id, endsAt);
  await publishEventState(event.channelId);
}

/** Cancelación manual (desde DRAFT, SUGGESTIONS_ACTIVE o SUGGESTIONS_FINISHED). */
export async function cancelEvent(eventId: string): Promise<void> {
  const { event, round } = await getEventWithCurrentRound(eventId);
  assertTransition(event.status, "CANCELLED");

  clearPhaseTimer(event.id);
  await db.$transaction([
    db.event.update({
      where: { id: event.id },
      data: { status: "CANCELLED", endedAt: new Date() },
    }),
    db.round.update({ where: { id: round.id }, data: { phaseEndsAt: null } }),
  ]);
  await publishEventState(event.channelId, {
    event: SOCKET_EVENTS.CANCELLED,
    payload: { channelId: event.channelId },
  });
}

/**
 * TIE | COMPLETED → SUGGESTIONS_ACTIVE: nueva ronda del mismo evento. La
 * fase de sugerencias arranca de inmediato con su temporizador.
 */
export async function newRound(eventId: string): Promise<void> {
  const { event, round } = await getEventWithCurrentRound(eventId);
  assertTransition(event.status, "SUGGESTIONS_ACTIVE");

  const now = new Date();
  const endsAt = new Date(now.getTime() + event.suggestionDurationSec * 1000);
  await db.$transaction([
    db.event.update({
      where: { id: event.id },
      data: { status: "SUGGESTIONS_ACTIVE", endedAt: null },
    }),
    db.round.create({
      data: {
        eventId: event.id,
        number: round.number + 1,
        phase: "SUGGESTIONS",
        phaseStartedAt: now,
        phaseEndsAt: endsAt,
      },
    }),
  ]);
  programPhaseTimer(event.id, endsAt);
  await publishEventState(event.channelId);
}

/**
 * Callback de los temporizadores de fase (y de la rehidratación al arranque):
 * aplica la transición automática según el estado actual del evento.
 */
export async function handlePhaseExpiry(eventId: string): Promise<void> {
  try {
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) return;
    if (event.status === "SUGGESTIONS_ACTIVE") {
      await finishSuggestions(eventId, { automatic: true });
    } else if (event.status === "VOTING_ACTIVE") {
      await finishVoting(eventId);
    }
  } catch (err) {
    // Un cambio manual concurrente puede invalidar la transición: se loguea
    // y se descarta, nunca debe tumbar el proceso.
    console.error(`Error en la expiración de fase del evento ${eventId}:`, err);
  }
}
