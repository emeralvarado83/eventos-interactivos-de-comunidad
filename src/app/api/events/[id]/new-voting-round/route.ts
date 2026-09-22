// POST /api/events/[id]/new-voting-round — COMPLETED → VOTING_ACTIVE: nueva
// ronda del evento de votación repitiendo las mismas opciones (votos a cero).

import { handleEventAction } from "@/lib/auth/guard";
import { newVotingRound } from "@/lib/events/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, newVotingRound);
}
