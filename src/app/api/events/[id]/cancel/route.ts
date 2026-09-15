// POST /api/events/[id]/cancel — cancelación manual del evento.

import { handleEventAction } from "@/lib/auth/guard";
import { cancelEvent } from "@/lib/events/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return handleEventAction(id, cancelEvent);
}
