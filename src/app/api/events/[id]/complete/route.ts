// POST /api/events/[id]/complete — cierre definitivo del evento según su
// tipo: SUGGESTIONS_FINISHED → COMPLETED (sugerencias), VOTING_FINISHED →
// COMPLETED (votación, confirma el resultado) o REGISTRATION_CLOSED →
// COMPLETED (sorteo finalizado sin sortear, p. ej. sin participantes).

import { handleEventAction } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { BusinessError } from "@/lib/errors";
import { completeEvent } from "@/lib/events/service";
import { completeRaffle } from "@/lib/raffle/service";

async function dispatchComplete(eventId: string): Promise<void> {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) throw new BusinessError("Evento no encontrado");
  if (event.type === "RAFFLE") return completeRaffle(eventId);
  return completeEvent(eventId);
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, dispatchComplete);
}
