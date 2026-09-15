"use client";

import { useCallback, useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  SOCKET_EVENTS,
  type EventStateSnapshot,
} from "@/lib/realtime/contracts";

const FALLBACK_DELAY_MS = 3000;

interface UseChannelSocketOptions {
  channelId: string;
  /** Endpoint del que obtener el snapshot si el socket tarda en conectar. */
  fallbackUrl: string;
}

interface UseChannelSocket {
  snapshot: EventStateSnapshot | null;
  connected: boolean;
  /** Permite aplicar al estado local la respuesta de una acción HTTP. */
  setSnapshot: (snapshot: EventStateSnapshot) => void;
}

/**
 * Conecta al servidor Socket.IO del mismo origen, se une a la room del canal
 * y mantiene el último snapshot recibido (event:state es la fuente de verdad).
 */
export function useChannelSocket({
  channelId,
  fallbackUrl,
}: UseChannelSocketOptions): UseChannelSocket {
  const [snapshot, setSnapshotState] = useState<EventStateSnapshot | null>(
    null
  );
  const [connected, setConnected] = useState(false);
  const [prevChannelId, setPrevChannelId] = useState(channelId);

  // Reinicio del estado al cambiar de canal (ajuste durante el render).
  if (prevChannelId !== channelId) {
    setPrevChannelId(channelId);
    setSnapshotState(null);
    setConnected(false);
  }

  const setSnapshot = useCallback((next: EventStateSnapshot) => {
    setSnapshotState(next);
  }, []);

  useEffect(() => {
    const socket: Socket = io();

    socket.on("connect", () => {
      setConnected(true);
      socket.emit(SOCKET_EVENTS.JOIN, { channelId });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on(SOCKET_EVENTS.STATE, (state: EventStateSnapshot) => {
      setSnapshot(state);
    });

    // Respaldo: si el socket no conecta a tiempo, pedir el estado por HTTP.
    const fallbackTimer = setTimeout(async () => {
      if (socket.connected) return;
      try {
        const res = await fetch(fallbackUrl, { cache: "no-store" });
        if (res.ok) {
          setSnapshot((await res.json()) as EventStateSnapshot);
        }
      } catch {
        // El socket seguirá reintentando la conexión por su cuenta.
      }
    }, FALLBACK_DELAY_MS);

    return () => {
      clearTimeout(fallbackTimer);
      socket.disconnect();
    };
  }, [channelId, fallbackUrl, setSnapshot]);

  return { snapshot, connected, setSnapshot };
}
