// POST /api/events — crea un evento (DRAFT + ronda 1) para el canal de la
// sesión. Body JSON opcional: { suggestionDurationSec, votingDurationSec,
// maxGames }. Duraciones: enteros entre 10 y 3600 (default 60/60).
// maxGames: entero entre 1 y 50 (default 10).

import { NextRequest, NextResponse } from "next/server";
import { BusinessError } from "@/lib/errors";
import { createEvent, getCurrentSnapshot } from "@/lib/events/service";
import { parseEventConfig } from "@/lib/events/config";
import { businessError, rateLimited, requireSession, unauthorized } from "@/lib/auth/guard";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!checkRateLimit(`mut:${session.userId}`)) return rateLimited();

  try {
    const body = await request.json().catch(() => null);
    await createEvent(session.channelId, parseEventConfig(body));
    const snapshot = await getCurrentSnapshot(session.channelId);
    return NextResponse.json(snapshot, { status: 201 });
  } catch (err) {
    if (err instanceof BusinessError) return businessError(err);
    throw err;
  }
}
