// POST /api/events/[id]/redraw — COMPLETED → DRAWING: nuevo ganador
// excluyendo a los ganadores anteriores.

import { handleEventAction } from "@/lib/auth/guard";
import { redraw } from "@/lib/raffle/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, redraw);
}
