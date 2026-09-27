import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getLatestCompletedSuggestions } from "@/lib/events/service";
import { GamepadIcon, ListIcon } from "../components/icons";

const CARD = "rounded-2xl border border-violet-500/20 bg-[#0c0718]/80";

export default async function JuegosSugeridosPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const data = await getLatestCompletedSuggestions(session.channelId);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="border-b border-violet-500/10 px-6 py-5">
        <h1 className="font-display text-xl text-white">Juegos sugeridos</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Sugerencias del último evento realizado.
        </p>
      </header>

      <main className="flex-1 p-6">
        {!data || data.suggestions.length === 0 ? (
          <div className={`${CARD} flex flex-col items-center gap-3 p-10 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
              <ListIcon className="h-6 w-6 text-violet-300" />
            </span>
            <p className="text-sm font-bold text-zinc-200">
              Todavía no hay juegos sugeridos
            </p>
            <p className="max-w-md text-sm text-zinc-500">
              Cuando un evento de sugerencias termine, la lista de juegos
              sugeridos por el chat aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className={`${CARD} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-violet-500/10 px-5 py-4">
              <p className="text-sm font-bold text-zinc-200">
                {data.suggestions.length}{" "}
                {data.suggestions.length === 1 ? "juego sugerido" : "juegos sugeridos"}
              </p>
              <p className="text-xs text-zinc-500">
                Evento finalizado el{" "}
                {(data.endedAt ?? data.createdAt).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <ul className="divide-y divide-violet-500/10">
              {data.suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.id}
                  className="flex items-center gap-4 px-5 py-3"
                >
                  <span className="w-7 shrink-0 text-center font-display text-sm text-violet-300">
                    {index + 1}
                  </span>
                  <GamepadIcon className="h-4.5 w-4.5 shrink-0 text-zinc-500" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">
                    {suggestion.gameName}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    por {suggestion.twitchLogin}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
