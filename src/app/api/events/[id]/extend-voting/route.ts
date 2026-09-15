// POST /api/events/[id]/extend-voting — TIE → VOTING_ACTIVE con +60s fijos,
// conservando los votos ya emitidos.

import { handleEventAction } from "@/lib/auth/guard";
import { extendVoting } from "@/lib/events/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, extendVoting);
}
