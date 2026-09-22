"use client";

import { PlusIcon } from "./icons";

interface EmptyStateProps {
  pending: boolean;
  onCreateEvent: () => void;
}

export function EmptyState({ pending, onCreateEvent }: EmptyStateProps) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 rounded-2xl border border-violet-500/20 bg-[#0c0718]/80 px-8 py-16 text-center">
      <div>
        <h2 className="font-display text-2xl text-white">
          No hay ningún evento activo
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Crea un evento para interactuar con tu comunidad.
        </p>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={onCreateEvent}
        className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-[0_6px_24px_rgba(139,92,246,0.35)] transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <PlusIcon className="h-4 w-4" />
        {pending ? "Creando…" : "Crear nuevo evento"}
      </button>
    </section>
  );
}
