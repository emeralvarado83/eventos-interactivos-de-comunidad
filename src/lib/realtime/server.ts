// Socket.IO sobre el servidor HTTP custom (Fase 4). Singleton en globalThis
// para que los servicios puedan emitir sin recibir `io` por parámetro y sin
// duplicar el servidor en dev (hot reload de tsx).
//
// IMPORTANTE: no importar servicios de negocio a nivel de módulo aquí — el
// servicio de eventos importa este módulo para emitir, así que el snapshot
// inicial del JOIN se pide con import perezoso dentro del handler.

import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { SOCKET_EVENTS, type EventStateSnapshot } from "@/lib/realtime/contracts";

const globalForRealtime = globalThis as unknown as { io?: Server };

function roomFor(channelId: string): string {
  return `channel:${channelId}`;
}

export function initRealtime(httpServer: HttpServer): Server {
  if (globalForRealtime.io) return globalForRealtime.io;

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    socket.on(SOCKET_EVENTS.JOIN, async (payload: unknown) => {
      try {
        const channelId = (payload as { channelId?: unknown } | null)?.channelId;
        if (typeof channelId !== "string" || channelId.trim() === "") return;
        await socket.join(roomFor(channelId));
        // Import perezoso: evita el ciclo events/service → realtime/server.
        const { getCurrentSnapshot } = await import("@/lib/events/service");
        const snapshot = await getCurrentSnapshot(channelId);
        socket.emit(SOCKET_EVENTS.STATE, snapshot);
      } catch (err) {
        console.error("Error al unir un socket a la room del canal:", err);
      }
    });
  });

  globalForRealtime.io = io;
  return io;
}

/** Emite un evento a todos los clientes de la room de un canal. No-op si aún no hay servidor. */
export function emitToChannel(
  channelId: string,
  event: string,
  payload: unknown
): void {
  globalForRealtime.io?.to(roomFor(channelId)).emit(event, payload);
}

export function emitState(channelId: string, snapshot: EventStateSnapshot): void {
  emitToChannel(channelId, SOCKET_EVENTS.STATE, snapshot);
}
