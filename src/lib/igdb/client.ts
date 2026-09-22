// Cliente IGDB (catálogo oficial de videojuegos de Twitch) para validar las
// sugerencias del chat. Usa app access token (client credentials) con las
// mismas credenciales de la app de Twitch: no requiere login del streamer.
//
// Las llamadas se serializan con un intervalo mínimo para respetar el límite
// de 4 req/s de IGDB, y llevan timeout para no bloquear el procesamiento del
// chat. Ninguna falla tumba el proceso: el caller decide (fail-open).

import { config } from "@/lib/config";

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const GAMES_URL = "https://api.igdb.com/v4/games";
// Refrescar el app token si caduca en menos de este margen.
const TOKEN_REFRESH_MARGIN_MS = 60_000;
const REQUEST_TIMEOUT_MS = 2_500;
// IGDB permite 4 req/s; espaciamos los inicios de las llamadas reales.
const MIN_INTERVAL_MS = 250;

interface AppToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: AppToken | null = null;

async function requestAppToken(): Promise<AppToken> {
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
    throw new Error(`Error al pedir app token para IGDB (${res.status}): ${detail}`);
  }
  // El flujo client credentials no devuelve refresh_token: se renueva pidiendo
  // uno nuevo cuando caduca (expires_in suele ser ~60 días).
  const data = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function getAppToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
    return cachedToken.accessToken;
  }
  cachedToken = await requestAppToken();
  return cachedToken.accessToken;
}

// Cola serializada: cada tarea espera a que termine la anterior y deja pasar
// MIN_INTERVAL_MS entre inicios, así una ráfaga de mensajes de chat no supera
// el límite de peticiones de IGDB.
let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, lastCallAt + MIN_INTERVAL_MS - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastCallAt = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

async function postGames(accessToken: string, query: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(GAMES_URL, {
      method: "POST",
      headers: {
        "Client-Id": config.twitchClientId,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "text/plain",
      },
      body: query,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ejecuta una consulta Apicalypse contra /v4/games. Lanza ante timeout, error
 * de red o respuesta no OK (con un reintento usando token fresco si fue 401).
 */
export async function queryGames<T>(query: string): Promise<T[]> {
  return enqueue(async () => {
    let token = await getAppToken();
    let res = await postGames(token, query);
    if (res.status === 401) {
      // Token revocado o caducado antes de tiempo: renovar y reintentar una vez.
      cachedToken = null;
      token = await getAppToken();
      res = await postGames(token, query);
    }
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Error al consultar IGDB (${res.status}): ${detail}`);
    }
    return (await res.json()) as T[];
  });
}
