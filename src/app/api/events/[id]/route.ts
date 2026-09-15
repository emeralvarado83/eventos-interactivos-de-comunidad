// PATCH /api/events/[id] — edita la configuración del evento (duraciones y
// máximo de juegos). Solo permitido mientras el evento está en DRAFT.
// Body JSON: { suggestionDurationSec, votingDurationSec, maxGames }.

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
    if (
      config.suggestionDurationSec === undefined ||
      config.votingDurationSec === undefined ||
      config.maxGames === undefined
    ) {
      throw new BusinessError(
        "El body debe incluir suggestionDurationSec, votingDurationSec y maxGames"
      );
    }
  } catch (err) {
    if (err instanceof BusinessError) return businessError(err);
    throw err;
  }

  const fullConfig = {
    suggestionDurationSec: config.suggestionDurationSec,
    votingDurationSec: config.votingDurationSec,
    maxGames: config.maxGames,
  };
  return handleEventAction(id, (eventId) =>
    updateEventConfig(eventId, fullConfig)
  );
}
