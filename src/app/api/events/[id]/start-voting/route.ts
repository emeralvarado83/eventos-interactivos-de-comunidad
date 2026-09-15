// POST /api/events/[id]/start-voting — SUGGESTIONS_FINISHED → VOTING_ACTIVE
// (fija las VotingOption con posiciones estables 1..n).

import { handleEventAction } from "@/lib/auth/guard";
import { startVoting } from "@/lib/events/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, startVoting);
}
