// POST /api/events/[id]/start-raffle — DRAFT → REGISTRATION_OPEN.

import { handleEventAction } from "@/lib/auth/guard";
import { startRaffle } from "@/lib/raffle/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, startRaffle);
}
