// GET /api/overlay/[channelId] — snapshot público del evento del canal para
// el overlay de OBS (sin autenticación; solo expone datos de lectura).

import { NextResponse } from "next/server";
import { getCurrentSnapshot } from "@/lib/events/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await params;
  if (!channelId) {
    return NextResponse.json({ error: "channel_required" }, { status: 400 });
  }
  return NextResponse.json(await getCurrentSnapshot(channelId));
}
