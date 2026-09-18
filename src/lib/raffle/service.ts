// Servicio del sorteo (Event.type = RAFFLE): inscripción de participantes
// desde el chat (!participo, silencioso como las sugerencias), ciclo de vida
// DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → DRAWING → COMPLETED,
// re-sorteo con exclusión de ganadores previos y nuevo sorteo.
//
// El ganador se fija en BD al entrar en DRAWING pero el snapshot lo oculta
// hasta COMPLETED (getCurrentSnapshot), para que la animación del overlay no
// tenga spoilers ni al recargar.

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { BusinessError } from "@/lib/errors";
import { assertTransition } from "@/lib/events/state-machine";
import {
  handlePhaseExpiry,
  publishEventState,
} from "@/lib/events/service";
import {
  SOCKET_EVENTS,
  type RaffleParticipantView,
} from "@/lib/realtime/contracts";
import { clearPhaseTimer, schedulePhaseTimer } from "@/lib/timers";

/** Duración de la animación "Seleccionando ganador…" antes de revelar. */
export const DRAWING_DURATION_SEC = 5;

const PARTICIPANT_COMMAND = "!participo";

/** ¿El mensaje es exactamente el comando de participación? */
export function isParticipationCommand(text: string): boolean {
  return text.trim().toLowerCase() === PARTICIPANT_COMMAND;
}

/** Índice ganador en [0, count). rng inyectable para tests deterministas. */
export function pickWinnerIndex(
  count: number,
  rng: () => number = Math.random
): number {
  if (count <= 0) {
    throw new BusinessError("No quedan participantes para sortear");
  }
  return Math.min(count - 1, Math.floor(rng() * count));
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

function programPhaseTimer(eventId: string, endsAt: Date): void {
  schedulePhaseTimer(eventId, endsAt, () => handlePhaseExpiry(eventId));
}

/** Carga el evento validando que es un sorteo, con su ronda de timing. */
async function getRaffleEvent(eventId: string) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { rounds: { orderBy: { number: "desc" }, take: 1 } },
  });
  if (!event) throw new BusinessError("Evento no encontrado");
  if (event.type !== "RAFFLE") {
    throw new BusinessError("Este evento no es un sorteo");
  }
  const round = event.rounds[0];
  if (!round) throw new BusinessError("El evento no tiene ninguna ronda");
  return { event, round };
}

/* ------------------------------ Participantes ------------------------------ */

export type AddParticipantResult = "added" | "ignored";

/**
 * Inscribe un participante desde el chat. Rechazos SILENCIOSOS (nunca se
 * responde al chat): evento/fase incorrecta, sorteo lleno o duplicado
 * (mismo twitchUserId, constraint P2002).
 */
export async function addParticipant(
  eventId: string,
  twitchUserId: string,
  twitchLogin: string
): Promise<AddParticipantResult> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { raffleParticipants: true } } },
  });
  if (
    !event ||
    event.type !== "RAFFLE" ||
    event.status !== "REGISTRATION_OPEN"
  ) {
    return "ignored";
  }
  if (
    event.maxParticipants !== null &&
    event._count.raffleParticipants >= event.maxParticipants
  ) {
    return "ignored";
  }

  let participant;
  try {
    participant = await db.raffleParticipant.create({
      data: { eventId: event.id, twitchUserId, twitchLogin },
    });
  } catch (err) {
    // !participo repetido: ya estaba inscrito, no se duplica.
    if (isUniqueViolation(err)) return "ignored";
    throw err;
  }

  const view: RaffleParticipantView = {
    id: participant.id,
    twitchLogin: participant.twitchLogin,
    createdAt: participant.createdAt.toISOString(),
  };
  await publishEventState(event.channelId, {
    event: SOCKET_EVENTS.PARTICIPANT_ADDED,
    payload: view,
  });
  return "added";
}

/* ------------------------------ Ciclo de vida ------------------------------ */

/** DRAFT → REGISTRATION_OPEN: abre la inscripción con su temporizador. */
export async function startRaffle(eventId: string): Promise<void> {
  const { event, round } = await getRaffleEvent(eventId);
  assertTransition(event.status, "REGISTRATION_OPEN");

  const now = new Date();
  const endsAt = new Date(now.getTime() + event.registrationDurationSec * 1000);
  await db.$transaction([
    db.event.update({
      where: { id: event.id },
      data: { status: "REGISTRATION_OPEN", startedAt: event.startedAt ?? now },
    }),
    db.round.update({
      where: { id: round.id },
      data: { phase: "REGISTRATION", phaseStartedAt: now, phaseEndsAt: endsAt },
    }),
  ]);
  programPhaseTimer(event.id, endsAt);
  await publishEventState(event.channelId);
}

/**
 * REGISTRATION_OPEN → REGISTRATION_CLOSED. Si la expiración es automática y
 * no hay participantes, el evento se cancela solo (igual que sugerencias).
 */
export async function finishRegistration(
  eventId: string,
  options: { automatic?: boolean } = {}
): Promise<void> {
  const { event, round } = await getRaffleEvent(eventId);

  if (options.automatic) {
    // El timer solo actúa si la fase sigue abierta: un cierre manual
    // concurrente invalida la expiración.
    if (event.status !== "REGISTRATION_OPEN") return;
    const count = await db.raffleParticipant.count({
      where: { eventId: event.id },
    });
    if (count === 0) {
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

  assertTransition(event.status, "REGISTRATION_CLOSED");
  clearPhaseTimer(event.id);
  await db.$transaction([
    db.event.update({
      where: { id: event.id },
      data: { status: "REGISTRATION_CLOSED" },
    }),
    db.round.update({
      where: { id: round.id },
      data: { phase: "FINISHED", phaseEndsAt: null },
    }),
  ]);
  await publishEventState(event.channelId);
}

/**
 * Núcleo del sorteo: excluye al ganador anterior (si lo hay), elige un
 * ganador aleatorio entre los elegibles y entra en DRAWING con el timer de
 * la animación. Todo en una transacción: si no hay elegibles, nada cambia.
 */
async function beginDraw(
  eventId: string,
  channelId: string,
  roundId: string
): Promise<void> {
  const now = new Date();
  const endsAt = new Date(now.getTime() + DRAWING_DURATION_SEC * 1000);

  await db.$transaction(async (tx) => {
    // Un ganador anterior (re-sorteo) queda excluido automáticamente.
    await tx.raffleParticipant.updateMany({
      where: { eventId, isWinner: true },
      data: { isWinner: false, excludedFromRedraw: true },
    });
    const eligible = await tx.raffleParticipant.findMany({
      where: { eventId, excludedFromRedraw: false },
      orderBy: { createdAt: "asc" },
    });
    if (eligible.length === 0) {
      throw new BusinessError("No quedan participantes para sortear");
    }
    const winner = eligible[pickWinnerIndex(eligible.length)];
    await tx.raffleParticipant.update({
      where: { id: winner.id },
      data: { isWinner: true },
    });
    await tx.event.update({
      where: { id: eventId },
      data: { status: "DRAWING", endedAt: null },
    });
    await tx.round.update({
      where: { id: roundId },
      data: { phaseStartedAt: now, phaseEndsAt: endsAt },
    });
  });

  programPhaseTimer(eventId, endsAt);
  await publishEventState(channelId);
}

/** REGISTRATION_CLOSED → DRAWING: "Realizar sorteo". */
export async function drawWinner(eventId: string): Promise<void> {
  const { event, round } = await getRaffleEvent(eventId);
  assertTransition(event.status, "DRAWING");
  await beginDraw(event.id, event.channelId, round.id);
}

/** COMPLETED → DRAWING: "Volver a sortear" (excluye al ganador anterior). */
export async function redraw(eventId: string): Promise<void> {
  const { event, round } = await getRaffleEvent(eventId);
  assertTransition(event.status, "DRAWING");
  await beginDraw(event.id, event.channelId, round.id);
}

/**
 * DRAWING → COMPLETED: fin de la animación (timer). Revela el ganador.
 * Una expiración obsoleta (estado ya cambiado manualmente) se descarta.
 */
export async function completeDraw(eventId: string): Promise<void> {
  const { event, round } = await getRaffleEvent(eventId);
  if (event.status !== "DRAWING") return;
  assertTransition(event.status, "COMPLETED");

  clearPhaseTimer(event.id);
  await db.$transaction([
    db.event.update({
      where: { id: event.id },
      data: { status: "COMPLETED", endedAt: new Date() },
    }),
    db.round.update({
      where: { id: round.id },
      data: { phaseEndsAt: null },
    }),
  ]);
  await publishEventState(event.channelId, {
    event: SOCKET_EVENTS.COMPLETED,
    payload: { channelId: event.channelId },
  });
}

/**
 * COMPLETED → REGISTRATION_OPEN: "Nuevo sorteo". Borra los participantes y
 * reabre la inscripción con la misma configuración, sobre el mismo evento.
 */
export async function newRaffle(eventId: string): Promise<void> {
  const { event, round } = await getRaffleEvent(eventId);
  assertTransition(event.status, "REGISTRATION_OPEN");

  const now = new Date();
  const endsAt = new Date(now.getTime() + event.registrationDurationSec * 1000);
  await db.$transaction([
    db.raffleParticipant.deleteMany({ where: { eventId: event.id } }),
    db.event.update({
      where: { id: event.id },
      data: { status: "REGISTRATION_OPEN", endedAt: null },
    }),
    db.round.update({
      where: { id: round.id },
      data: { phase: "REGISTRATION", phaseStartedAt: now, phaseEndsAt: endsAt },
    }),
  ]);
  programPhaseTimer(event.id, endsAt);
  await publishEventState(event.channelId);
}
