// Temporizadores de fase: el servidor es la autoridad del tiempo. Cada fase
// persiste phaseEndsAt en la ronda y programa un setTimeout; al arrancar el
// proceso se rehidratan los timers de las rondas aún activas (si phaseEndsAt
// ya pasó, la transición se ejecuta de inmediato).

const timers = new Map<string, NodeJS.Timeout>();

export function clearPhaseTimer(eventId: string): void {
  const timer = timers.get(eventId);
  if (timer) {
    clearTimeout(timer);
    timers.delete(eventId);
  }
}

/**
 * Programa la expiración de la fase de un evento. Si endsAt ya pasó, ejecuta
 * onExpire de forma asíncrona inmediata. Sustituye cualquier timer previo del
 * mismo evento.
 */
export function schedulePhaseTimer(
  eventId: string,
  endsAt: Date,
  onExpire: () => void | Promise<void>
): void {
  clearPhaseTimer(eventId);
  const run = () => {
    timers.delete(eventId);
    Promise.resolve(onExpire()).catch((err) => {
      console.error(`Error al expirar la fase del evento ${eventId}:`, err);
    });
  };
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) {
    timers.set(eventId, setTimeout(run, 0));
    return;
  }
  timers.set(eventId, setTimeout(run, ms));
}

/**
 * Al arrancar: reprograma los timers de los eventos que quedaron con una fase
 * temporizada activa (p. ej. tras un reinicio del proceso): sugerencias,
 * votación, inscripción del sorteo y la animación del ganador.
 */
export async function rehydrateTimers(): Promise<void> {
  // Import perezoso: evita el ciclo events/service → timers → events/service
  // y no exige la base de datos en tiempo de importación.
  const { db } = await import("@/lib/db");
  const { handlePhaseExpiry } = await import("@/lib/events/service");

  const events = await db.event.findMany({
    where: {
      status: {
        in: [
          "SUGGESTIONS_ACTIVE",
          "VOTING_ACTIVE",
          "REGISTRATION_OPEN",
          "DRAWING",
        ],
      },
    },
    include: { rounds: { orderBy: { number: "desc" }, take: 1 } },
  });

  for (const event of events) {
    const round = event.rounds[0];
    if (!round?.phaseEndsAt) continue;
    schedulePhaseTimer(event.id, round.phaseEndsAt, () =>
      handlePhaseExpiry(event.id)
    );
  }
}
