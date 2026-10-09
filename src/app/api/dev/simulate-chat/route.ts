// POST /api/dev/simulate-chat — SOLO DESARROLLO. Inyecta un mensaje de chat
// falso en el mismo procesador que usa Twitch EventSub, para simular un en
// vivo sin stream real. En producción responde 404.
//
// Body JSON: { text: string, login?: string, subscriber?: boolean }
// El canal se toma del primer canal registrado en la DB (entorno local
// de un solo streamer). Cada llamada usa un twitchUserId estable por login
// para respetar las reglas de duplicados (una sugerencia/voto por espectador).

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { processChatMessage } from "@/lib/chat/processor";

/** twitchUserId falso pero estable a partir del login (9 dígitos numéricos). */
function fakeTwitchUserId(login: string): string {
  const hash = createHash("sha256").update(`sim:${login}`).digest();
  // 9 dígitos empezando en 1 para parecer un twitchId real.
  const num = (hash.readUInt32BE(0) % 900_000_000) + 100_000_000;
  return String(num);
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";
  const login =
    typeof body?.login === "string" && body.login.trim()
      ? body.login.trim().toLowerCase()
      : "viewer";
  const subscriber = body?.subscriber === true;

  if (!text.trim()) {
    return NextResponse.json({ error: "text requerido" }, { status: 400 });
  }

  const channel = await db.channel.findFirst({ orderBy: { createdAt: "asc" } });
  if (!channel) {
    return NextResponse.json(
      { error: "No hay ningún canal registrado (inicia sesión primero)" },
      { status: 400 }
    );
  }

  await processChatMessage({
    channelTwitchId: channel.twitchId,
    twitchUserId: fakeTwitchUserId(login),
    twitchLogin: login,
    text,
    badges: subscriber ? ["subscriber"] : [],
  });

  return NextResponse.json({ ok: true, login, text });
}
