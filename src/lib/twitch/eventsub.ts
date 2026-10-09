// Gestor de Twitch EventSub sobre WebSocket (Fase 8): una conexión por
// streamer, suscripción a `channel.chat.message` con el user access token del
// propio streamer (transporte websocket: funciona en localhost, sin URL
// pública). Usa el WebSocket global de Node 22+, sin dependencias extra.
//
// Además del chat, se suscribe a `stream.online`/`stream.offline` para
// empujar el estado del directo al dashboard por Socket.IO al instante.
//
// Todas las fallas se loguean y jamás tumban el proceso: la DB puede no estar
// disponible, los tokens pueden estar caducados y Twitch puede cortar la
// conexión (reconexión con backoff exponencial).

import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { decryptSecret, encryptSecret } from "@/lib/auth/crypto";
import { refreshAccessToken } from "@/lib/twitch/oauth";
import { setCachedLiveStatus } from "@/lib/twitch/helix";
import { SOCKET_EVENTS } from "@/lib/realtime/contracts";

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

interface EventSubMessage {
  metadata: { message_id: string; message_type: string };
  payload: {
    session?: { id: string; reconnect_url?: string | null };
    subscription?: { type?: string };
    event?: {
      broadcaster_user_id?: string;
      chatter_user_id?: string;
      chatter_user_login?: string;
      message?: { text?: string };
      badges?: { set_id?: string }[];
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

async function createSubscription(
  accessToken: string,
  sessionId: string,
  type: string,
  condition: Record<string, string>
): Promise<void> {
  const res = await fetch(SUBSCRIPTIONS_URL, {
    method: "POST",
    headers: {
      "Client-Id": config.twitchClientId,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type,
      version: "1",
      condition,
      transport: { method: "websocket", session_id: sessionId },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Suscripción EventSub rechazada (${res.status}): ${detail}`);
  }
}

/**
 * Crea las suscripciones de la sesión: chat + cambios del estado del directo.
 * Un fallo en una no impide crear las demás (se loguea y se sigue).
 */
async function subscribeToEvents(twitchUserId: string, sessionId: string): Promise<void> {
  const accessToken = await getValidAccessToken(twitchUserId);
  const specs: { type: string; condition: Record<string, string> }[] = [
    {
      type: "channel.chat.message",
      // El streamer escucha su propio chat: broadcaster = user.
      condition: { broadcaster_user_id: twitchUserId, user_id: twitchUserId },
    },
    { type: "stream.online", condition: { broadcaster_user_id: twitchUserId } },
    { type: "stream.offline", condition: { broadcaster_user_id: twitchUserId } },
  ];
  for (const spec of specs) {
    try {
      await createSubscription(accessToken, sessionId, spec.type, spec.condition);
    } catch (err) {
      console.error(`Suscripción ${spec.type} falló para ${twitchUserId}:`, err);
    }
  }
}

/** stream.online/stream.offline: actualiza la caché de Helix y avisa al dashboard. */
async function handleStreamStatusChange(twitchUserId: string, live: boolean): Promise<void> {
  // La caché hace que /api/twitch/live refleje el cambio sin esperar a Helix.
  setCachedLiveStatus(twitchUserId, live);
  const channel = await db.channel.findUnique({ where: { twitchId: twitchUserId } });
  if (!channel) return;
  // Import perezoso para evitar ciclos entre módulos de servicio.
  const { emitToChannel } = await import("@/lib/realtime/server");
  emitToChannel(channel.id, SOCKET_EVENTS.LIVE_STATUS, { live });
}

async function handleNotification(
  twitchUserId: string,
  message: EventSubMessage,
  state: ConnectionState
): Promise<void> {
  // Dedup por message_id: Twitch puede reenviar notificaciones.
  const messageId = message.metadata.message_id;
  if (state.seenMessageIds.has(messageId)) return;
  if (state.seenMessageIds.size >= MAX_SEEN_MESSAGE_IDS) state.seenMessageIds.clear();
  state.seenMessageIds.add(messageId);

  const type = message.payload.subscription?.type;
  if (type === "stream.online" || type === "stream.offline") {
    await handleStreamStatusChange(twitchUserId, type === "stream.online");
    return;
  }
  if (type !== "channel.chat.message") return;

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
    badges: (event.badges ?? [])
      .map((b) => b.set_id)
      .filter((id): id is string => Boolean(id)),
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
    let message: EventSubMessage;
    try {
      message = JSON.parse(raw.data) as EventSubMessage;
    } catch {
      return;
    }

    switch (message.metadata.message_type) {
      case "session_welcome": {
        const sessionId = message.payload.session?.id;
        state.attempts = 0;
        // En un socket de reconnect_url las suscripciones se conservan.
        if (sessionId && !isReconnectSocket) {
          await subscribeToEvents(twitchUserId, sessionId);
        }
        break;
      }
      case "session_keepalive":
        break;
      case "notification":
        await handleNotification(twitchUserId, message, state);
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
