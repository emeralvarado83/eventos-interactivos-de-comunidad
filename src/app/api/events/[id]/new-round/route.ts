// POST /api/events/[id]/new-round — TIE | COMPLETED → SUGGESTIONS_ACTIVE con
// una nueva ronda del mismo evento.

import { handleEventAction } from "@/lib/auth/guard";
import { newRound } from "@/lib/events/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, newRound);
}
