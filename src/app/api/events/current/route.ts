// GET /api/events/current — snapshot del evento activo del canal de la sesión.

import { NextResponse } from "next/server";
import { getCurrentSnapshot } from "@/lib/events/service";
import { requireSession, unauthorized } from "@/lib/auth/guard";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  return NextResponse.json(await getCurrentSnapshot(session.channelId));
}
