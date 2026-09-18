import type { EventStatusName } from "@/lib/realtime/contracts";

const STATUS_STYLES: Record<EventStatusName, { label: string; classes: string }> = {
  DRAFT: {
    label: "En preparación",
    classes: "border-zinc-600 bg-zinc-800/60 text-zinc-300",
  },
  SUGGESTIONS_ACTIVE: {
    label: "Sugerencias abiertas",
    classes: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
  },
  SUGGESTIONS_FINISHED: {
    label: "Sugerencias cerradas",
    classes: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  },
  VOTING_ACTIVE: {
    label: "Votación abierta",
    classes: "border-violet-400/60 bg-violet-500/15 text-violet-300",
  },
  VOTING_FINISHED: {
    label: "Votación cerrada",
    classes: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  },
  TIE: {
    label: "Empate",
    classes: "border-amber-400/60 bg-amber-400/15 text-amber-300",
  },
  COMPLETED: {
    label: "Evento finalizado",
    classes: "border-amber-300/60 bg-amber-300/10 text-amber-200",
  },
  CANCELLED: {
    label: "Cancelado",
    classes: "border-red-500/50 bg-red-500/10 text-red-300",
  },
  REGISTRATION_OPEN: {
    label: "Inscripciones abiertas",
    classes: "border-emerald-500/50 bg-emerald-500/15 text-emerald-300",
  },
  REGISTRATION_CLOSED: {
    label: "Inscripciones cerradas",
    classes: "border-amber-400/50 bg-amber-400/10 text-amber-300",
  },
  DRAWING: {
    label: "Seleccionando ganador…",
    classes: "border-violet-400/60 bg-violet-500/15 text-violet-300",
  },
};

export function StatusPill({ status }: { status: EventStatusName }) {
  const { label, classes } = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-widest ${classes}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
