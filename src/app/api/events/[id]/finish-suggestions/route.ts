// POST /api/events/[id]/finish-suggestions — SUGGESTIONS_ACTIVE →
// SUGGESTIONS_FINISHED (cierre manual; el automático lo hace el timer).

import { handleEventAction } from "@/lib/auth/guard";
import { finishSuggestions } from "@/lib/events/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, (eventId) => finishSuggestions(eventId));
}
