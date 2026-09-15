// POST /api/events/[id]/start-suggestions — DRAFT → SUGGESTIONS_ACTIVE.

import { handleEventAction } from "@/lib/auth/guard";
import { startSuggestions } from "@/lib/events/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, startSuggestions);
}
