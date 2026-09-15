// GET /api/me — usuario y canal de la sesión actual (401 si no hay sesión).

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "no_authenticated" }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: session.userId,
      twitchId: session.twitchId,
      login: session.login,
      displayName: session.displayName,
    },
    channel: { id: session.channelId },
  });
}
