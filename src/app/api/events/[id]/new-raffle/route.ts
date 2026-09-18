// POST /api/events/[id]/new-raffle — COMPLETED → REGISTRATION_OPEN: borra
// los participantes y reabre la inscripción con la misma configuración.

import { handleEventAction } from "@/lib/auth/guard";
import { newRaffle } from "@/lib/raffle/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, newRaffle);
}
