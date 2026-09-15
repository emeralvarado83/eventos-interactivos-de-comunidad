// DELETE /api/suggestions/[id] — veto desde el dashboard: elimina la
// sugerencia y crea el SuggestionBan de la ronda. Devuelve el snapshot
// actualizado del canal.

import { NextResponse } from "next/server";
import { BusinessError } from "@/lib/errors";
import { removeAndBanSuggestion } from "@/lib/suggestions/service";
import { getCurrentSnapshot } from "@/lib/events/service";
import {
  businessError,
  getOwnedSuggestion,
  notFound,
  rateLimited,
  requireSession,
  unauthorized,
} from "@/lib/auth/guard";
import { checkRateLimit } from "@/lib/rate-limit";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!checkRateLimit(`mut:${session.userId}`)) return rateLimited();

  const { id } = await params;
  const suggestion = await getOwnedSuggestion(id, session.channelId);
  if (!suggestion) return notFound("suggestion");

  try {
    await removeAndBanSuggestion(suggestion.id);
    return NextResponse.json(await getCurrentSnapshot(session.channelId));
  } catch (err) {
    if (err instanceof BusinessError) return businessError(err);
    throw err;
  }
}
