// PATCH /api/events/[id] — edita el tipo y la configuración del evento.
// Solo permitido mientras el evento está en DRAFT. El body es consciente del
// tipo: SUGGESTIONS → { type, suggestionDurationSec }; VOTING → { type,
// votingDurationSec, maxOptions, optionSource, options? }; RAFFLE → { type,
// registrationDurationSec, maxParticipants }.
// La validación por tipo vive en updateEventConfig.

import { NextRequest } from "next/server";
import { businessError, handleEventAction } from "@/lib/auth/guard";
import { updateEventConfig } from "@/lib/events/service";
import { parseEventConfig } from "@/lib/events/config";
import { BusinessError } from "@/lib/errors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let config: ReturnType<typeof parseEventConfig>;
  try {
    config = parseEventConfig(await request.json().catch(() => null));
  } catch (err) {
    if (err instanceof BusinessError) return businessError(err);
    throw err;
  }

  return handleEventAction(id, (eventId) => updateEventConfig(eventId, config));
}
