"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckIcon, CopyIcon, LogoutIcon } from "./icons";

interface TopbarProps {
  displayName: string;
  /** URL del avatar de Twitch; null muestra iniciales. */
  avatarUrl: string | null;
  copied: boolean;
  onCopyOverlayUrl: () => void;
  /**
   * Estado del directo empujado por el socket (EventSub stream.online/offline);
   * null hasta el primer evento, en cuyo caso manda el sondeo HTTP.
   */
  liveStatus: boolean | null;
}

// Sondeo de respaldo del estado del directo: lo normal es que el cambio llegue
// al instante por socket (EventSub); esto reconcilia si un evento se pierde.
const LIVE_POLL_MS = 60_000;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** Estado real del directo: el push del socket manda; el sondeo HTTP cubre el arranque y reconcilia. */
function useLiveStatus(liveStatus: boolean | null): boolean | null {
  const [polled, setPolled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkLive() {
      try {
        const res = await fetch("/api/twitch/live");
        if (!res.ok) return;
        const data = (await res.json()) as { live?: unknown };
        if (!cancelled && typeof data.live === "boolean") {
          setPolled(data.live);
        }
      } catch {
        // Error de red: se reintenta en el siguiente sondeo.
      }
    }

    void checkLive();
    const timer = setInterval(checkLive, LIVE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return liveStatus ?? polled;
}

export function Topbar({
  displayName,
  avatarUrl,
  copied,
  onCopyOverlayUrl,
  liveStatus,
}: TopbarProps) {
  const live = useLiveStatus(liveStatus);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-violet-500/15 bg-[#0c0718]/60 px-6 py-3.5">
      <div className="flex items-center gap-2.5">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={`Avatar de ${displayName}`}
            width={36}
            height={36}
            className="h-9 w-9 rounded-full"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-700 text-sm font-black text-white">
            {initials(displayName)}
          </span>
        )}
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">{displayName}</p>
          <p className="flex items-center gap-1 text-[11px] font-medium text-violet-300/80">
            {live !== null && (
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  live ? "bg-emerald-400" : "bg-zinc-500"
                }`}
              />
            )}
            {live === null
              ? "Comprobando directo…"
              : live
                ? "En vivo en Twitch"
                : "Fuera de línea"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onCopyOverlayUrl}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-violet-500"
        >
          {copied ? (
            <CheckIcon className="h-3.5 w-3.5" />
          ) : (
            <CopyIcon className="h-3.5 w-3.5" />
          )}
          {copied ? "¡Copiado!" : "Copiar enlace del overlay"}
        </button>

        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            title="Cerrar sesión"
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <LogoutIcon className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>
    </header>
  );
}
