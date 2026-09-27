// Cliente mínimo de la API Helix con app access token (client credentials).
// Se usa para consultas públicas que no dependen del token del streamer,
// como saber si un canal está en directo (GET /helix/streams).

import { config } from "@/lib/config";

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const STREAMS_URL = "https://api.twitch.tv/helix/streams";

// Margen para renovar el app token antes de que Twitch lo expire.
const TOKEN_EXPIRY_MARGIN_MS = 60_000;
// Caché corta del estado del directo para no repetir la llamada a Helix en
// cada sondeo del dashboard.
const LIVE_CACHE_TTL_MS = 45_000;

let appToken: { value: string; expiresAt: number } | null = null;
const liveCache = new Map<string, { live: boolean; expiresAt: number }>();

async function getAppAccessToken(): Promise<string> {
  if (appToken && appToken.expiresAt > Date.now()) {
    return appToken.value;
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.twitchClientId,
      client_secret: config.twitchClientSecret,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Error al pedir el app token a Twitch (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  appToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - TOKEN_EXPIRY_MARGIN_MS,
  };
  return appToken.value;
}

/** true si el canal está emitiendo en directo ahora mismo. */
export async function isChannelLive(twitchId: string): Promise<boolean> {
  const cached = liveCache.get(twitchId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.live;
  }
  const token = await getAppAccessToken();
  const res = await fetch(
    `${STREAMS_URL}?user_id=${encodeURIComponent(twitchId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Client-Id": config.twitchClientId,
      },
    }
  );
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Error al consultar el directo en Twitch (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as { data: Array<{ type: string }> };
  const live = data.data.some((stream) => stream.type === "live");
  liveCache.set(twitchId, { live, expiresAt: Date.now() + LIVE_CACHE_TTL_MS });
  return live;
}
