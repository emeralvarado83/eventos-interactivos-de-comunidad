// POST /api/events/[id]/draw — REGISTRATION_CLOSED → DRAWING: elige al
// ganador y arranca la animación de selección.

import { handleEventAction } from "@/lib/auth/guard";
import { drawWinner } from "@/lib/raffle/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, drawWinner);
}
