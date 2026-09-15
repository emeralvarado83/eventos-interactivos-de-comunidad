"use client";

import { CheckIcon, CopyIcon, LogoutIcon } from "./icons";

interface TopbarProps {
  displayName: string;
  connected: boolean;
  copied: boolean;
  onCopyOverlayUrl: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function Topbar({
  displayName,
  connected,
  copied,
  onCopyOverlayUrl,
}: TopbarProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-violet-500/15 bg-[#0c0718]/60 px-6 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-violet-700 text-sm font-black text-white">
          {initials(displayName)}
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">{displayName}</p>
          <p className="flex items-center gap-1 text-[11px] font-medium text-violet-300/80">
            {connected && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            )}
            {connected ? "En vivo en Twitch" : "Sin conexión"}
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
