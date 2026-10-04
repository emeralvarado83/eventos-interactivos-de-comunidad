"use client";

import {
  EVENT_TYPES,
  type EventTypeName,
} from "@/lib/realtime/contracts";
import { EVENT_TYPE_META } from "@/lib/branding";

interface EmptyStateProps {
  pending: boolean;
  onCreateEvent: (type: EventTypeName) => void;
}

const TYPE_HINTS: Record<EventTypeName, string> = {
  SUGGESTIONS: "El chat propone juegos",
  VOTING: "El chat vota entre opciones tuyas o importadas de sugerencias.",
  RAFFLE: "El chat participa con un comando establecido por el streamer",
};

export function EmptyState({ pending, onCreateEvent }: EmptyStateProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 rounded-2xl border border-violet-500/20 bg-[#0c0718]/80 px-8 py-16 text-center">
      <div>
        <h2 className="font-display text-2xl text-white">
          No hay ningún evento activo
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Elige el tipo de evento para interactuar con tu comunidad.
        </p>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        {EVENT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            disabled={pending}
            onClick={() => onCreateEvent(t)}
            className="flex flex-col gap-1.5 rounded-xl border border-violet-500/25 bg-[#080512] px-4 py-4 text-left transition-colors hover:border-violet-400/60 hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-sm font-bold text-white">
              {EVENT_TYPE_META[t].label}
            </span>
            <span className="text-[11px] font-medium text-zinc-500">
              {TYPE_HINTS[t]}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
