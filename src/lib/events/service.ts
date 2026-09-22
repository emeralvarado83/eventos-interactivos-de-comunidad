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
  type OptionSourceName,
} from "@/lib/realtime/contracts";
import { emitState, emitToChannel } from "@/lib/realtime/server";
import { clearPhaseTimer, schedulePhaseTimer } from "@/lib/timers";
import { computeRanking, resolveOutcome } from "@/lib/voting/service";

const EXTEND_VOTING_SEC = 60; // extensión fija de la votación tras un empate
const MIN_DURATION_SEC = 10;
const MAX_DURATION_SEC = 3600;
const MIN_MAX_OPTIONS = 1;
const MAX_MAX_OPTIONS = 50;
const DEFAULT_MAX_OPTIONS = 10;
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

function validMaxOptions(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_MAX_OPTIONS &&
    value <= MAX_MAX_OPTIONS
  );
}

function validMaxParticipants(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= MIN_MAX_PARTICIPANTS &&
    value <= MAX_MAX_PARTICIPANTS
  );
}

/** Config de un evento de Sugerencias (SUGGESTIONS), completa y válida. */
function assertValidSuggestionsConfig(config: {
  suggestionDurationSec: number;
}): void {
  if (!validDuration(config.suggestionDurationSec)) {
    throw new BusinessError(
      `La duración debe ser un entero entre ${MIN_DURATION_SEC} y ${MAX_DURATION_SEC} segundos`
    );
  }
}

/** Config de un evento de Votación (VOTING), completa y válida. */
function assertValidVotingConfig(config: {
  votingDurationSec: number;
  maxOptions: number;
  optionSource: OptionSourceName;
  options?: string[];
}): void {
  if (!validDuration(config.votingDurationSec)) {
    throw new BusinessError(
      `La duración debe ser un entero entre ${MIN_DURATION_SEC} y ${MAX_DURATION_SEC} segundos`
    );
  }
  if (!validMaxOptions(config.maxOptions)) {
    throw new BusinessError(
      `El máximo de opciones debe ser un entero entre ${MIN_MAX_OPTIONS} y ${MAX_MAX_OPTIONS}`
    );
  }
  if (config.optionSource === "MANUAL") {
    if (!config.options || config.options.length < 2) {
      throw new BusinessError(
        "Una votación con opciones manuales necesita al menos 2 opciones"
      );
    }
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
    maxOptions?: number;
    optionSource?: OptionSourceName;
    options?: string[];
    registrationDurationSec?: number;
    maxParticipants?: number | null;
  } = {}
) {
  const type = options.type ?? "SUGGESTIONS";
  const suggestionDurationSec = options.suggestionDurationSec ?? 60;
  const votingDurationSec = options.votingDurationSec ?? 60;
  const maxOptions = options.maxOptions ?? DEFAULT_MAX_OPTIONS;
  const optionSource = options.optionSource ?? "MANUAL";
  const registrationDurationSec =
    options.registrationDurationSec ?? DEFAULT_REGISTRATION_SEC;
  const maxParticipants = options.maxParticipants ?? null;

  if (type === "RAFFLE") {
    assertValidRaffleConfig({ registrationDurationSec, maxParticipants });
  } else if (type === "VOTING") {
    assertValidVotingConfig({
      votingDurationSec,
      maxOptions,
      optionSource,
      options: options.options,
    });
  } else {
    assertValidSuggestionsConfig({ suggestionDurationSec });
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
      maxOptions,
      optionSource,
      registrationDurationSec,
      maxParticipants,
      rounds: { create: { number: 1, phase: "SUGGESTIONS" } },
      ...(type === "VOTING" && optionSource === "MANUAL" && options.options
        ? {
            eventOptions: {
              create: options.options.map((label, i) => ({
                position: i + 1,
                label,
              })),
            },
          }
        : {}),
    },
    include: { rounds: true, eventOptions: true },
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
  } else if (type === "VOTING") {
    if (
      config.votingDurationSec === undefined ||
      config.maxOptions === undefined ||
      config.optionSource === undefined
    ) {
      throw new BusinessError(
        "El body debe incluir votingDurationSec, maxOptions y optionSource"
      );
    }
    assertValidVotingConfig({
      votingDurationSec: config.votingDurationSec,
      maxOptions: config.maxOptions,
      optionSource: config.optionSource,
      options: config.options,
    });
    await db.$transaction([
      db.event.update({
        where: { id: event.id },
        data: {
          type,
          votingDurationSec: config.votingDurationSec,
          maxOptions: config.maxOptions,
          optionSource: config.optionSource,
        },
      }),
      // Las opciones manuales se reemplazan por completo en cada guardado.
      db.eventOption.deleteMany({ where: { eventId: event.id } }),
      ...(config.optionSource === "MANUAL" && config.options
        ? [
            db.eventOption.createMany({
              data: config.options.map((label, i) => ({
                eventId: event.id,
                position: i + 1,
                label,
              })),
            }),
          ]
        : []),
    ]);
  } else {
    if (config.suggestionDurationSec === undefined) {
      throw new BusinessError("El body debe incluir suggestionDurationSec");
    }
    assertValidSuggestionsConfig({
      suggestionDurationSec: config.suggestionDurationSec,
    });
    await db.event.update({
      where: { id: event.id },
      data: {
        type,
        suggestionDurationSec: config.suggestionDurationSec,
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
    raffleParticipants: [],
    raffleWinner: null,
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
      eventOptions: { orderBy: { position: "asc" } },
      raffleParticipants: { orderBy: { createdAt: "asc" } },
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
    } else if (
      event.status === "COMPLETED" ||
      event.status === "VOTING_FINISHED"
    ) {
      // En VOTING_FINISHED el ganador es una vista previa pendiente de que el
      // streamer confirme el resultado (completeVoting).
      const outcome = resolveOutcome(ranked);
      if (outcome.type === "winner") winner = outcome.winner;
    }
  }

  // Ganador del sorteo: fijado en BD al entrar en DRAWING, pero solo se
  // revela cuando el evento llega a COMPLETED (fin de la animación).
  let raffleWinner: EventStateSnapshot["raffleWinner"] = null;
  if (event.type === "RAFFLE" && event.status === "COMPLETED") {
    const winnerParticipant = event.raffleParticipants.find((p) => p.isWinner);
    if (winnerParticipant) {
      raffleWinner = { twitchLogin: winnerParticipant.twitchLogin };
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
      maxOptions: event.maxOptions,
      optionSource: event.optionSource,
      manualOptions: event.eventOptions.map((o) => o.label),
      registrationDurationSec: event.registrationDurationSec,
      maxParticipants: event.maxParticipants,
      endedAt: event.endedAt?.toISOString() ?? null,
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
    raffleParticipants: event.raffleParticipants.map((p) => ({
      id: p.id,
      twitchLogin: p.twitchLogin,
      createdAt: p.createdAt.toISOString(),
    })),
    raffleWinner,
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
  if (event.type !== "SUGGESTIONS") {
    throw new BusinessError("Este evento no es de sugerencias");
  }
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
 * SUGGESTIONS_FINISHED → COMPLETED: cierre del evento de sugerencias. La
 * lista queda disponible como origen de un posterior evento de VOTING con
 * optionSource = FROM_SUGGESTIONS.
 */
export async function completeSuggestions(eventId: string): Promise<void> {
  const { event, round } = await getEventWithCurrentRound(eventId);
  if (event.type !== "SUGGESTIONS") {
    throw new BusinessError("Este evento no es de sugerencias");
  }
  assertTransition(event.status, "COMPLETED");

  await db.$transaction([
    db.event.update({
      where: { id: event.id },
      data: { status: "COMPLETED", endedAt: new Date() },
    }),
    db.round.update({
      where: { id: round.id },
      data: { phase: "FINISHED", phaseEndsAt: null },
    }),
  ]);
  await publishEventState(event.channelId, {
    event: SOCKET_EVENTS.COMPLETED,
    payload: { channelId: event.channelId, winner: null },
  });
}

/**
 * DRAFT → VOTING_ACTIVE: fija las VotingOption con posiciones estables 1..n.
 * El origen depende de `event.optionSource`: MANUAL usa las EventOption
 * escritas por el streamer; FROM_SUGGESTIONS importa las sugerencias del
 * último evento de Sugerencias COMPLETED del canal (limitadas a maxOptions).
 */
export async function startVoting(eventId: string): Promise<void> {
  const { event, round } = await getEventWithCurrentRound(eventId);
  if (event.type !== "VOTING") {
    throw new BusinessError("Este evento no es de votación");
  }
  assertTransition(event.status, "VOTING_ACTIVE");

  let labels: string[];
  if (event.optionSource === "MANUAL") {
    const manualOptions = await db.eventOption.findMany({
      where: { eventId: event.id },
      orderBy: { position: "asc" },
    });
    if (manualOptions.length < 2) {
      throw new BusinessError(
        "No se puede iniciar la votación con menos de 2 opciones"
      );
    }
    labels = manualOptions.map((o) => o.label);
  } else {
    const source = await db.event.findFirst({
      where: { channelId: event.channelId, type: "SUGGESTIONS", status: "COMPLETED" },
      orderBy: { createdAt: "desc" },
      include: {
        rounds: {
          orderBy: { number: "desc" },
          take: 1,
          include: { suggestions: { orderBy: { createdAt: "asc" } } },
        },
      },
    });
    const suggestions = source?.rounds[0]?.suggestions ?? [];
    if (suggestions.length === 0) {
      throw new BusinessError(
        "No hay un evento de sugerencias finalizado con sugerencias"
      );
    }
    labels = suggestions.slice(0, event.maxOptions).map((s) => s.gameName);
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + event.votingDurationSec * 1000);
  await db.$transaction([
    db.votingOption.createMany({
      data: labels.map((label, i) => ({
        roundId: round.id,
        position: i + 1,
        gameName: label,
      })),
    }),
    db.round.update({
      where: { id: round.id },
      data: { phase: "VOTING", phaseStartedAt: now, phaseEndsAt: endsAt },
    }),
    db.event.update({
      where: { id: event.id },
      data: { status: "VOTING_ACTIVE", startedAt: event.startedAt ?? now },
    }),
  ]);
  programPhaseTimer(event.id, endsAt);
  await publishEventState(event.channelId);
}

/**
 * VOTING_ACTIVE → VOTING_FINISHED: cierra la votación. Si hay empate en
 * cabeza (2+ opciones con los mismos votos > 0) el evento pasa a TIE para
 * poder extender; en caso contrario queda en VOTING_FINISHED a la espera de
 * que el streamer revise el resultado y lo confirme con completeVoting.
 * Si la expiración es automática y nadie votó, el evento se cancela solo.
 */
export async function finishVoting(
  eventId: string,
  options: { automatic?: boolean } = {}
): Promise<void> {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new BusinessError("Evento no encontrado");

  if (options.automatic) {
    // El timer solo actúa si la fase sigue activa: un cierre manual
    // concurrente invalida la expiración.
    if (event.status !== "VOTING_ACTIVE") return;
    const round = await db.round.findFirst({
      where: { eventId },
      orderBy: { number: "desc" },
      include: { _count: { select: { votes: true } } },
    });
    if (round && round._count.votes === 0) {
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

  const isTie = await db.$transaction(async (tx) => {
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

    assertTransition(current.status, "VOTING_FINISHED");
    const result = resolveOutcome(
      round.votingOptions.map((o) => ({
        position: o.position,
        gameName: o.gameName,
        votes: o._count.votes,
      }))
    );

    if (result.type === "tie") {
      // Se validan ambos pasos de la máquina de estados aunque en DB solo se
      // persiste el estado final.
      assertTransition("VOTING_FINISHED", "TIE");
      await tx.event.update({
        where: { id: eventId },
        data: { status: "TIE", endedAt: null },
      });
    } else {
      await tx.event.update({
        where: { id: eventId },
        data: { status: "VOTING_FINISHED" },
      });
    }
    await tx.round.update({
      where: { id: round.id },
      data: { phase: "FINISHED", phaseEndsAt: null },
    });
    return result.type === "tie" ? result : null;
  });

  clearPhaseTimer(eventId);
  await publishEventState(
    event.channelId,
    isTie
      ? {
          event: SOCKET_EVENTS.TIE,
          payload: { channelId: event.channelId, tiedPositions: isTie.tiedPositions },
        }
      : undefined
  );
}

/**
 * VOTING_FINISHED → COMPLETED: el streamer confirma el resultado de la
 * votación (ganador o "sin participación" si nadie votó) y el evento
 * termina. Los empates ya se resolvieron como TIE al cerrar la votación.
 */
export async function completeVoting(eventId: string): Promise<void> {
  const { event, round } = await getEventWithCurrentRound(eventId);
  if (event.type !== "VOTING") {
    throw new BusinessError("Este evento no es de votación");
  }
  assertTransition(event.status, "COMPLETED");

  const options = await db.votingOption.findMany({
    where: { roundId: round.id },
    include: { _count: { select: { votes: true } } },
  });
  const outcome =
    options.length > 0
      ? resolveOutcome(
          options.map((o) => ({
            position: o.position,
            gameName: o.gameName,
            votes: o._count.votes,
          }))
        )
      : ({ type: "none" } as const);
  const winner = outcome.type === "winner" ? outcome.winner : null;

  await db.event.update({
    where: { id: event.id },
    data: { status: "COMPLETED", endedAt: new Date() },
  });
  await publishEventState(event.channelId, {
    event: SOCKET_EVENTS.COMPLETED,
    payload: { channelId: event.channelId, winner },
  });
}

/**
 * Cierre definitivo del evento según su tipo: SUGGESTIONS confirma la lista
 * de sugerencias; VOTING confirma el resultado de la votación.
 */
export async function completeEvent(eventId: string): Promise<void> {
  const event = await getEventById(eventId);
  if (!event) throw new BusinessError("Evento no encontrado");
  if (event.type === "VOTING") return completeVoting(eventId);
  return completeSuggestions(eventId);
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

/** Cancelación manual (desde DRAFT, SUGGESTIONS_*, VOTING_ACTIVE o REGISTRATION_*). */
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
 * COMPLETED → SUGGESTIONS_ACTIVE: nueva ronda del mismo evento de
 * sugerencias. La fase arranca de inmediato con su temporizador.
 */
export async function newRound(eventId: string): Promise<void> {
  const { event, round } = await getEventWithCurrentRound(eventId);
  if (event.type !== "SUGGESTIONS") {
    throw new BusinessError("Este evento no es de sugerencias");
  }
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
 * COMPLETED → VOTING_ACTIVE: nueva ronda del mismo evento de votación,
 * repitiendo las mismas opciones de la ronda anterior (votos a cero). La
 * votación arranca de inmediato con su temporizador.
 */
export async function newVotingRound(eventId: string): Promise<void> {
  const { event, round } = await getEventWithCurrentRound(eventId);
  if (event.type !== "VOTING") {
    throw new BusinessError("Este evento no es de votación");
  }
  assertTransition(event.status, "VOTING_ACTIVE");

  const previousOptions = await db.votingOption.findMany({
    where: { roundId: round.id },
    orderBy: { position: "asc" },
  });
  if (previousOptions.length === 0) {
    throw new BusinessError("La ronda anterior no tiene opciones que repetir");
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + event.votingDurationSec * 1000);
  const newRoundNumber = round.number + 1;
  await db.$transaction(async (tx) => {
    await tx.event.update({
      where: { id: event.id },
      data: { status: "VOTING_ACTIVE", endedAt: null },
    });
    const created = await tx.round.create({
      data: {
        eventId: event.id,
        number: newRoundNumber,
        phase: "VOTING",
        phaseStartedAt: now,
        phaseEndsAt: endsAt,
      },
    });
    await tx.votingOption.createMany({
      data: previousOptions.map((o) => ({
        roundId: created.id,
        position: o.position,
        gameName: o.gameName,
      })),
    });
  });
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
      await finishVoting(eventId, { automatic: true });
    } else if (
      event.status === "REGISTRATION_OPEN" ||
      event.status === "DRAWING"
    ) {
      // Import perezoso: evita el ciclo events/service ↔ raffle/service.
      const { finishRegistration, completeDraw } = await import(
        "@/lib/raffle/service"
      );
      if (event.status === "REGISTRATION_OPEN") {
        await finishRegistration(eventId, { automatic: true });
      } else {
        await completeDraw(eventId);
      }
    }
  } catch (err) {
    // Un cambio manual concurrente puede invalidar la transición: se loguea
    // y se descarta, nunca debe tumbar el proceso.
    console.error(`Error en la expiración de fase del evento ${eventId}:`, err);
  }
}
