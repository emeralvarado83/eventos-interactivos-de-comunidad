// PATCH /api/channel/settings — guarda los ajustes del canal de la sesión
// (color de tema, sonido de alerta, restricción "solo subs"). El snapshot
// actualizado llega a overlay y dashboard vía socket al guardar.

import { NextRequest, NextResponse } from "next/server";
import {
  businessError,
  rateLimited,
  unauthorized,
  requireSession,
} from "@/lib/auth/guard";
import { checkRateLimit } from "@/lib/rate-limit";
import { BusinessError } from "@/lib/errors";
import {
  parseChannelSettings,
  updateChannelSettings,
} from "@/lib/channel/settings";

export async function PATCH(request: NextRequest) {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!checkRateLimit(`mut:${session.userId}`)) return rateLimited();

  let settings: ReturnType<typeof parseChannelSettings>;
  try {
    settings = parseChannelSettings(await request.json().catch(() => null));
    const updated = await updateChannelSettings(session.channelId, settings);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof BusinessError) return businessError(err);
    throw err;
  }
}
