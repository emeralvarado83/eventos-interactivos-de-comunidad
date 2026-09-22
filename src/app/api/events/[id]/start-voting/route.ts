// POST /api/events/[id]/start-voting — DRAFT → VOTING_ACTIVE: fija las
// VotingOption con posiciones estables 1..n a partir de las opciones
// manuales (MANUAL) o del último evento de sugerencias completado
// (FROM_SUGGESTIONS).

import { handleEventAction } from "@/lib/auth/guard";
import { startVoting } from "@/lib/events/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, startVoting);
}
