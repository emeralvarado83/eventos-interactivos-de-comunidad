// POST /api/events/[id]/finish-voting — cierra la votación y calcula el
// resultado: COMPLETED con ganadora o TIE si hay empate en cabeza.

import { handleEventAction } from "@/lib/auth/guard";
import { finishVoting } from "@/lib/events/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, finishVoting);
}
