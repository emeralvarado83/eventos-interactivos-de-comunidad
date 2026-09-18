// POST /api/events/[id]/finish-registration — REGISTRATION_OPEN →
// REGISTRATION_CLOSED (cierre manual; el automático lo hace el timer).

import { handleEventAction } from "@/lib/auth/guard";
import { finishRegistration } from "@/lib/raffle/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, finishRegistration);
}
