// Gestor de Twitch EventSub sobre WebSocket (Fase 8): una conexión por
// streamer, suscripción a `channel.chat.message` con el user access token del
// propio streamer (transporte websocket: funciona en localhost, sin URL
// pública). Usa el WebSocket global de Node 22+, sin dependencias extra.
//
// Todas las fallas se loguean y jamás tumban el proceso: la DB puede no estar
// disponible, los tokens pueden estar caducados y Twitch puede cortar la
// conexión (reconexión con backoff exponencial).

import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { decryptSecret, encryptSecret } from "@/lib/auth/crypto";
import { refreshAccessToken } from "@/lib/twitch/oauth";

const EVENTSUB_WS_URL = "wss://eventsub.wss.twitch.tv/ws";
const SUBSCRIPTIONS_URL = "https://api.twitch.tv/helix/eventsub/subscriptions";

// Refrescar el token si caduca en menos de este margen.
const TOKEN_REFRESH_MARGIN_MS = 60_000;
const MAX_SEEN_MESSAGE_IDS = 1_000;
const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

interface ConnectionState {
  socket: WebSocket | null;
  /** Cierre intencionado (p. ej. al adoptar un reconnect_url): no reintentar. */
  closing: boolean;
  attempts: number;
  seenMessageIds: Set<string>;
}

// Clave: twitchId del streamer.
const connections = new Map<string, ConnectionState>();

interface EventSubChatMessage {
  metadata: { message_id: string; message_type: string };
  payload: {
    session?: { id: string; reconnect_url?: string | null };
    subscription?: { type?: string };
    event?: {
      broadcaster_user_id?: string;
      chatter_user_id?: string;
      chatter_user_login?: string;
      message?: { text?: string };
    };
  };
}

function getState(twitchUserId: string): ConnectionState {
  let state = connections.get(twitchUserId);
  if (!state) {
    state = { socket: null, closing: false, attempts: 0, seenMessageIds: new Set() };
    connections.set(twitchUserId, state);
  }
  return state;
}

/** Access token válido del streamer: lo refresca y persiste (cifrado) si está a punto de caducar. */
async function getValidAccessToken(twitchUserId: string): Promise<string> {
  const user = await db.user.findUnique({ where: { twitchId: twitchUserId } });
  if (!user) throw new Error(`Usuario de Twitch ${twitchUserId} no encontrado en DB`);

  if (user.tokenExpiresAt.getTime() - Date.now() > TOKEN_REFRESH_MARGIN_MS) {
    return decryptSecret(user.accessToken);
  }

  const tokens = await refreshAccessToken(decryptSecret(user.refreshToken));
  await db.user.update({
    where: { id: user.id },
    data: {
      accessToken: encryptSecret(tokens.accessToken),
      refreshToken: encryptSecret(tokens.refreshToken),
      tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
    },
  });
  return tokens.accessToken;
}

async function subscribeToChat(twitchUserId: string, sessionId: string): Promise<void> {
  const accessToken = await getValidAccessToken(twitchUserId);
  const res = await fetch(SUBSCRIPTIONS_URL, {
    method: "POST",
    headers: {
      "Client-Id": config.twitchClientId,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "channel.chat.message",
      version: "1",
      // El streamer escucha su propio chat: broadcaster = user.
      condition: { broadcaster_user_id: twitchUserId, user_id: twitchUserId },
      transport: { method: "websocket", session_id: sessionId },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Suscripción EventSub rechazada (${res.status}): ${detail}`);
  }
}

async function handleNotification(message: EventSubChatMessage, state: ConnectionState): Promise<void> {
  if (message.payload.subscription?.type !== "channel.chat.message") return;

  // Dedup por message_id: Twitch puede reenviar notificaciones.
  const messageId = message.metadata.message_id;
  if (state.seenMessageIds.has(messageId)) return;
  if (state.seenMessageIds.size >= MAX_SEEN_MESSAGE_IDS) state.seenMessageIds.clear();
  state.seenMessageIds.add(messageId);

  const event = message.payload.event;
  const text = event?.message?.text;
  if (!event?.broadcaster_user_id || !event.chatter_user_id || !text) return;

  // Import perezoso para evitar ciclos entre módulos de servicio.
  const { processChatMessage } = await import("@/lib/chat/processor");
  await processChatMessage({
    channelTwitchId: event.broadcaster_user_id,
    twitchUserId: event.chatter_user_id,
    twitchLogin: event.chatter_user_login ?? event.chatter_user_id,
    text,
  });
}

function handleMessage(
  twitchUserId: string,
  state: ConnectionState,
  socket: WebSocket,
  raw: MessageEvent,
  isReconnectSocket: boolean
): void {
  void (async () => {
    if (typeof raw.data !== "string") return;
    let message: EventSubChatMessage;
    try {
      message = JSON.parse(raw.data) as EventSubChatMessage;
    } catch {
      return;
    }

    switch (message.metadata.message_type) {
      case "session_welcome": {
        const sessionId = message.payload.session?.id;
        state.attempts = 0;
        // En un socket de reconnect_url las suscripciones se conservan.
        if (sessionId && !isReconnectSocket) {
          await subscribeToChat(twitchUserId, sessionId);
        }
        break;
      }
      case "session_keepalive":
        break;
      case "notification":
        await handleNotification(message, state);
        break;
      case "session_reconnect": {
        const reconnectUrl = message.payload.session?.reconnect_url;
        if (reconnectUrl) adoptReconnectUrl(twitchUserId, state, socket, reconnectUrl);
        break;
      }
      case "revocation":
        console.warn(`Suscripción EventSub revocada para ${twitchUserId}:`, raw.data);
        break;
    }
  })().catch((err) => {
    console.error(`Error procesando mensaje EventSub de ${twitchUserId}:`, err);
  });
}

/** Twitch pide migrar a otra URL: se abre el nuevo socket y se cierra el viejo. */
function adoptReconnectUrl(
  twitchUserId: string,
  state: ConnectionState,
  oldSocket: WebSocket,
  reconnectUrl: string
): void {
  const next = openSocket(twitchUserId, state, reconnectUrl, true);
  next.addEventListener("open", () => {
    state.closing = true;
    oldSocket.close();
  });
}

function scheduleReconnect(twitchUserId: string, state: ConnectionState): void {
  state.attempts += 1;
  const backoff = Math.min(BASE_BACKOFF_MS * 2 ** (state.attempts - 1), MAX_BACKOFF_MS);
  const jitter = Math.floor(Math.random() * 1_000);
  setTimeout(() => {
    ensureConnection(twitchUserId).catch((err) => {
      console.error(`Error al reconectar EventSub de ${twitchUserId}:`, err);
    });
  }, backoff + jitter);
}

function openSocket(
  twitchUserId: string,
  state: ConnectionState,
  url: string,
  isReconnectSocket: boolean
): WebSocket {
  const socket = new WebSocket(url);
  state.socket = socket;

  socket.addEventListener("message", (raw) =>
    handleMessage(twitchUserId, state, socket, raw, isReconnectSocket)
  );
  socket.addEventListener("error", (err) => {
    console.error(`Error en el WebSocket EventSub de ${twitchUserId}:`, err);
  });
  socket.addEventListener("close", () => {
    if (state.socket !== socket) return; // ya fue reemplazado (reconnect_url)
    state.socket = null;
    if (state.closing) {
      state.closing = false;
      return;
    }
    console.warn(`WebSocket EventSub de ${twitchUserId} cerrado; reconectando...`);
    scheduleReconnect(twitchUserId, state);
  });
  return socket;
}

/**
 * Garantiza una conexión viva para el streamer (tras login, refresh o una
 * caída). No hace nada si ya hay un socket abierto o conectando.
 */
export async function ensureConnection(twitchUserId: string): Promise<void> {
  try {
    const state = getState(twitchUserId);
    if (
      state.socket &&
      (state.socket.readyState === WebSocket.OPEN ||
        state.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    openSocket(twitchUserId, state, EVENTSUB_WS_URL, false);
  } catch (err) {
    console.error(`No se pudo abrir EventSub para ${twitchUserId}:`, err);
  }
}

/** Al arrancar el servidor: conecta a todos los streamers registrados. */
export async function startAll(): Promise<void> {
  try {
    const users = await db.user.findMany({ select: { twitchId: true } });
    for (const user of users) {
      await ensureConnection(user.twitchId);
    }
  } catch (err) {
    console.error("No se pudieron iniciar las conexiones EventSub (¿DB caída?):", err);
  }
}
