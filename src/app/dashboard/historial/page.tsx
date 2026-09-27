import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getEventHistory } from "@/lib/events/service";
import { EVENT_TYPE_META } from "@/lib/branding";
import type { EventTypeName } from "@/lib/realtime/contracts";
import { StatusPill } from "../components/status-pill";
import {
  ChatIcon,
  HistoryIcon,
  ListIcon,
  UsersIcon,
} from "../components/icons";

const CARD = "rounded-2xl border border-violet-500/20 bg-[#0c0718]/80";

const TYPE_ICONS: Record<EventTypeName, typeof ChatIcon> = {
  SUGGESTIONS: ChatIcon,
  VOTING: ListIcon,
  RAFFLE: UsersIcon,
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function HistorialPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const events = await getEventHistory(session.channelId);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="border-b border-violet-500/10 px-6 py-5">
        <h1 className="font-display text-xl text-white">Historial</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Los últimos 10 eventos realizados.
        </p>
      </header>

      <main className="flex-1 p-6">
        {events.length === 0 ? (
          <div className={`${CARD} flex flex-col items-center gap-3 p-10 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
              <HistoryIcon className="h-6 w-6 text-violet-300" />
            </span>
            <p className="text-sm font-bold text-zinc-200">
              Todavía no hay eventos
            </p>
            <p className="max-w-md text-sm text-zinc-500">
              Cuando crees tu primer evento de sugerencias, votación o sorteo,
              aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className={`${CARD} overflow-hidden`}>
            <ul className="divide-y divide-violet-500/10">
              {events.map((event) => {
                const Icon = TYPE_ICONS[event.type];
                return (
                  <li key={event.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                      <Icon className="h-4.5 w-4.5 text-violet-300" />
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-sm font-medium text-zinc-100">
                        {EVENT_TYPE_META[event.type].label}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(event.createdAt)} · {formatTime(event.createdAt)}
                      </p>
                    </div>
                    <StatusPill status={event.status} />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
