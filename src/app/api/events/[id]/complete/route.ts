// POST /api/events/[id]/complete — cierre definitivo del evento según su
// tipo: SUGGESTIONS_FINISHED → COMPLETED (sugerencias) o VOTING_FINISHED →
// COMPLETED (votación, confirma el resultado).

import { handleEventAction } from "@/lib/auth/guard";
import { completeEvent } from "@/lib/events/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, completeEvent);
}
