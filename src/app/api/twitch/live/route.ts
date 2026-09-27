// GET /api/twitch/live — estado real del directo del canal de la sesión.

import { NextResponse } from "next/server";
import { requireSession, unauthorized } from "@/lib/auth/guard";
import { isChannelLive } from "@/lib/twitch/helix";

export async function GET() {
  const session = await requireSession();
  if (!session) return unauthorized();
  try {
    return NextResponse.json({ live: await isChannelLive(session.twitchId) });
  } catch (err) {
    console.error("Error al consultar el estado del directo:", err);
    return NextResponse.json(
      { error: "No se pudo consultar el estado del directo" },
      { status: 502 }
    );
  }
}
