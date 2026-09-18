"use client";

import { useEffect, useState } from "react";
import {
  type EventConfigPayload,
  type EventStateSnapshot,
} from "@/lib/realtime/contracts";
import { useChannelSocket } from "@/hooks/use-channel-socket";
import { formatCountdown, useCountdown } from "@/hooks/use-countdown";
import { EVENT_TYPE_META } from "@/lib/branding";
import { Sidebar } from "./components/sidebar";
import { Topbar } from "./components/topbar";
import { StatusPill } from "./components/status-pill";
import { EmptyState } from "./components/empty-state";
import { OverlayPreview } from "./components/overlay-preview";
import { ConfigPanel } from "./components/config-panel";
import {
  ClockIcon,
  CrownIcon,
  ExternalIcon,
  GamepadIcon,
  TrashIcon,
  UsersIcon,
} from "./components/icons";

const PRIMARY_BTN =
  "flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50";
const SECONDARY_BTN =
  "flex items-center gap-2 rounded-xl border border-violet-500/40 px-4 py-2.5 text-sm font-bold text-violet-200 transition-colors hover:border-violet-400/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50";
const DANGER_BTN =
  "flex items-center gap-2 rounded-xl border border-red-900 px-4 py-2.5 text-sm font-bold text-red-300 transition-colors hover:bg-red-950/60 disabled:cursor-not-allowed disabled:opacity-50";

const CARD =
  "rounded-2xl border border-violet-500/20 bg-[#0c0718]/80";

interface DashboardClientProps {
  channelId: string;
  displayName: string;
  channelLogin: string;
  overlayUrl: string;
}

export function DashboardClient({
  channelId,
  displayName,
  overlayUrl,
}: DashboardClientProps) {
  const { snapshot, connected, setSnapshot } = useChannelSocket({
    channelId,
    fallbackUrl: "/api/events/current",
  });
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function runAction(key: string, action: () => Promise<Response>) {
    setPending(key);
    setError(null);
    try {
      const res = await action();
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          data &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : `La acción ha fallado (HTTP ${res.status}).`;
        setError(message);
        return;
      }
      // El servidor también emite el nuevo estado por socket; lo aplicamos ya.
      if (data && typeof data === "object" && "channelId" in data) {
        setSnapshot(data as EventStateSnapshot);
      }
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setPending(null);
    }
  }

  function createEvent() {
    void runAction("create", () =>
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestionDurationSec: 60,
          votingDurationSec: 60,
          maxGames: 10,
        }),
      })
    );
  }

  function eventAction(key: string, action: string) {
    const eventId = snapshot?.event?.id;
    if (!eventId) return;
    void runAction(key, () =>
      fetch(`/api/events/${eventId}/${action}`, { method: "POST" })
    );
  }

  function saveConfig(config: EventConfigPayload) {
    const eventId = snapshot?.event?.id;
    if (!eventId) return;
    void runAction("config", () =>
      fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      })
    );
  }

  function removeSuggestion(suggestionId: string) {
    void runAction(`veto:${suggestionId}`, () =>
      fetch(`/api/suggestions/${suggestionId}`, { method: "DELETE" })
    );
  }

  async function copyOverlayUrl() {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("No se ha podido copiar la URL al portapapeles.");
    }
  }

  const status = snapshot?.event?.status ?? null;
  const hasEvent = status !== null && status !== "CANCELLED";
  const isVotingPhase =
    status === "VOTING_ACTIVE" ||
    status === "VOTING_FINISHED" ||
    status === "TIE" ||
    status === "COMPLETED";

  return (
    <div className="flex min-h-full flex-1 bg-[#0a0614] font-sans text-zinc-100">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          displayName={displayName}
          connected={connected}
          copied={copied}
          onCopyOverlayUrl={copyOverlayUrl}
        />

        <main className="flex flex-1 items-start gap-6 p-6">
          {/* Zona central */}
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {snapshot === null ? (
              <p className={`${CARD} p-6 text-sm text-zinc-500`}>
                Cargando el estado del evento…
              </p>
            ) : !hasEvent ? (
              <EmptyState
                pending={pending === "create"}
                onCreateEvent={createEvent}
              />
            ) : (
              <>
                <EventCard
                  snapshot={snapshot}
                  pending={pending}
                  onAction={eventAction}
                  overlayUrl={overlayUrl}
                />
                {snapshot.event!.type === "RAFFLE"
                  ? (status !== "DRAFT" ||
                      snapshot.raffleParticipants.length > 0) && (
                      <ParticipantsCard snapshot={snapshot} />
                    )
                  : (status !== "DRAFT" || snapshot.suggestions.length > 0) && (
                      <GamesCard
                        snapshot={snapshot}
                        isVotingPhase={isVotingPhase}
                        pending={pending}
                        onVeto={removeSuggestion}
                      />
                    )}
              </>
            )}

            {error && (
              <p className="rounded-xl border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}
          </div>

          {/* Columna derecha */}
          <div className="flex w-[380px] shrink-0 flex-col gap-6">
            <OverlayPreview overlayUrl={overlayUrl} empty={!hasEvent} />
            <ConfigPanel
              eventId={snapshot?.event?.id ?? null}
              type={snapshot?.event?.type ?? "GAME_SELECTION"}
              suggestionDurationSec={
                snapshot?.event?.suggestionDurationSec ?? 60
              }
              votingDurationSec={snapshot?.event?.votingDurationSec ?? 60}
              maxGames={snapshot?.event?.maxGames ?? 10}
              registrationDurationSec={
                snapshot?.event?.registrationDurationSec ?? 300
              }
              maxParticipants={snapshot?.event?.maxParticipants ?? null}
              editable={status === "DRAFT"}
              pending={pending === "config"}
              onSave={saveConfig}
            />
          </div>
        </main>

        <footer className="border-t border-violet-500/10 px-6 py-3">
          <p className="flex items-center gap-2 text-[11px] font-medium text-zinc-600">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {connected
              ? "Sistema listo — La comunidad puede sugerir y votar en el chat."
              : "Reconectando con el servidor en tiempo real…"}
          </p>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------ Tarjeta del evento ------------------------------ */

function EventCard({
  snapshot,
  pending,
  onAction,
  overlayUrl,
}: {
  snapshot: EventStateSnapshot;
  pending: string | null;
  onAction: (key: string, action: string) => void;
  overlayUrl: string;
}) {
  const event = snapshot.event!;
  const status = event.status;
  const countdown = useCountdown(snapshot.round?.phaseEndsAt);
  const progress = usePhaseProgress(
    snapshot.round?.phaseStartedAt,
    snapshot.round?.phaseEndsAt
  );

  const showCountdown =
    status === "SUGGESTIONS_ACTIVE" ||
    status === "VOTING_ACTIVE" ||
    status === "TIE" ||
    status === "REGISTRATION_OPEN";

  return (
    <section className={`${CARD} p-6`}>
      <p className="text-[11px] font-black uppercase tracking-[0.25em] text-violet-300">
        Evento actual · {EVENT_TYPE_META[event.type].label}
        {snapshot.round && (
          <span className="ml-2 text-zinc-500">
            · Ronda {snapshot.round.number}
          </span>
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
        <h2 className="font-display text-3xl text-white">
          {EVENT_TYPE_META[event.type].title}
        </h2>
        <StatusPill status={status} />
        {showCountdown && (
          <span className="flex items-center gap-2 font-mono text-2xl font-bold tabular-nums text-violet-300">
            <ClockIcon className="h-5 w-5" />
            {formatCountdown(countdown)}
          </span>
        )}
      </div>

      {showCountdown && progress !== null && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {status === "DRAFT" && (
        <p className="mt-3 text-sm text-zinc-400">
          Evento en preparación. Ajusta la configuración en el panel de la
          derecha e inicia el evento cuando estés listo.
        </p>
      )}

      {status === "REGISTRATION_CLOSED" && (
        <p className="mt-3 text-sm text-zinc-400">
          Sorteo listo · {snapshot.raffleParticipants.length}{" "}
          {snapshot.raffleParticipants.length === 1
            ? "participante"
            : "participantes"}
          . Las inscripciones han finalizado.
        </p>
      )}

      {status === "DRAWING" && (
        <p className="mt-3 text-sm font-semibold text-violet-300">
          🎰 Seleccionando ganador…
        </p>
      )}

      {status === "VOTING_FINISHED" && (
        <p className="mt-3 text-sm text-zinc-400">
          Calculando los resultados de la votación…
        </p>
      )}

      {status === "TIE" && (
        <p className="mt-3 text-sm font-semibold text-amber-300">
          ¡Empate en cabeza! Puedes extender la votación o empezar una nueva
          ronda.
        </p>
      )}

      {status === "COMPLETED" && snapshot.winner && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 py-3">
          <CrownIcon className="h-6 w-6 shrink-0 text-amber-300" />
          <p className="text-lg font-bold text-white">
            <span className="font-mono text-violet-300">
              #{snapshot.winner.position}
            </span>{" "}
            {snapshot.winner.gameName}
            <span className="ml-2 text-sm font-semibold text-zinc-400">
              {snapshot.winner.votes}{" "}
              {snapshot.winner.votes === 1 ? "voto" : "votos"}
            </span>
          </p>
        </div>
      )}

      {status === "COMPLETED" && snapshot.raffleWinner && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-300/50 bg-amber-300/10 px-4 py-3">
          <CrownIcon className="h-6 w-6 shrink-0 text-amber-300" />
          <p className="text-lg font-bold text-white">
            @{snapshot.raffleWinner.twitchLogin}
            <span className="ml-2 text-sm font-semibold text-zinc-400">
              {snapshot.raffleParticipants.length}{" "}
              {snapshot.raffleParticipants.length === 1
                ? "participante"
                : "participantes"}
              {event.endedAt &&
                ` · ${new Date(event.endedAt).toLocaleDateString("es-ES")}`}
            </span>
          </p>
        </div>
      )}

      {/* Estadísticas de la ronda */}
      {status !== "DRAFT" && (
        <div className="mt-5 flex flex-wrap items-center gap-6">
          {event.type === "RAFFLE" ? (
            <Stat
              icon={<UsersIcon className="h-5 w-5 text-violet-300" />}
              value={snapshot.raffleParticipants.length}
              label="Participantes inscritos"
            />
          ) : (
            <>
              <Stat
                icon={<GamepadIcon className="h-5 w-5 text-violet-300" />}
                value={snapshot.suggestions.length}
                label="Juegos sugeridos"
              />
              {(status === "VOTING_ACTIVE" ||
                status === "VOTING_FINISHED" ||
                status === "TIE" ||
                status === "COMPLETED") && (
                <Stat
                  icon={<UsersIcon className="h-5 w-5 text-violet-300" />}
                  value={snapshot.votingOptions.reduce(
                    (sum, o) => sum + o.votes,
                    0
                  )}
                  label="Votos totales"
                />
              )}
            </>
          )}
        </div>
      )}

      {/* Acciones según la fase */}
      <div className="mt-5 flex flex-wrap gap-2">
        {status === "DRAFT" && (
          <>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() =>
                onAction(
                  "start",
                  event.type === "RAFFLE" ? "start-raffle" : "start-suggestions"
                )
              }
              className={PRIMARY_BTN}
            >
              {pending === "start"
                ? "Iniciando…"
                : EVENT_TYPE_META[event.type].startLabel}
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("cancel", "cancel")}
              className={DANGER_BTN}
            >
              Cancelar evento
            </button>
          </>
        )}

        {status === "REGISTRATION_OPEN" && (
          <>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("finish-registration", "finish-registration")}
              className={PRIMARY_BTN}
            >
              {pending === "finish-registration"
                ? "Cerrando…"
                : "Cerrar sorteo"}
            </button>
            <ViewOverlayButton overlayUrl={overlayUrl} />
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("cancel", "cancel")}
              className={DANGER_BTN}
            >
              Cancelar
            </button>
          </>
        )}

        {status === "REGISTRATION_CLOSED" && (
          <>
            <button
              type="button"
              disabled={pending !== null || snapshot.raffleParticipants.length === 0}
              title={
                snapshot.raffleParticipants.length === 0
                  ? "No hay participantes inscritos"
                  : undefined
              }
              onClick={() => onAction("draw", "draw")}
              className={PRIMARY_BTN}
            >
              {pending === "draw" ? "Sorteando…" : "Realizar sorteo"}
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("cancel", "cancel")}
              className={DANGER_BTN}
            >
              Cancelar
            </button>
          </>
        )}

        {status === "SUGGESTIONS_ACTIVE" && (
          <>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("finish-sugg", "finish-suggestions")}
              className={PRIMARY_BTN}
            >
              {pending === "finish-sugg" ? "Cerrando…" : "Cerrar sugerencias"}
            </button>
            <ViewOverlayButton overlayUrl={overlayUrl} />
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("cancel", "cancel")}
              className={DANGER_BTN}
            >
              Cancelar
            </button>
          </>
        )}

        {status === "SUGGESTIONS_FINISHED" && (
          <>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("start-vote", "start-voting")}
              className={PRIMARY_BTN}
            >
              {pending === "start-vote" ? "Iniciando…" : "Iniciar votación"}
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("cancel", "cancel")}
              className={DANGER_BTN}
            >
              Cancelar
            </button>
          </>
        )}

        {status === "VOTING_ACTIVE" && (
          <>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("finish-vote", "finish-voting")}
              className={PRIMARY_BTN}
            >
              {pending === "finish-vote" ? "Cerrando…" : "Cerrar votación"}
            </button>
            <ViewOverlayButton overlayUrl={overlayUrl} />
          </>
        )}

        {status === "TIE" && (
          <>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("extend", "extend-voting")}
              className={PRIMARY_BTN}
            >
              {pending === "extend" ? "Añadiendo…" : "Añadir 1 minuto"}
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("new-round", "new-round")}
              className={SECONDARY_BTN}
            >
              Nueva ronda
            </button>
          </>
        )}

        {status === "COMPLETED" && event.type === "GAME_SELECTION" && (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => onAction("new-round", "new-round")}
            className={PRIMARY_BTN}
          >
            {pending === "new-round" ? "Creando…" : "Nueva ronda"}
          </button>
        )}

        {status === "COMPLETED" && event.type === "RAFFLE" && (
          <>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("redraw", "redraw")}
              className={SECONDARY_BTN}
            >
              {pending === "redraw" ? "Sorteando…" : "Volver a sortear"}
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("new-raffle", "new-raffle")}
              className={PRIMARY_BTN}
            >
              {pending === "new-raffle" ? "Creando…" : "Nuevo sorteo"}
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => onAction("cancel", "cancel")}
              className={DANGER_BTN}
            >
              Finalizar evento
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10">
        {icon}
      </span>
      <div className="leading-tight">
        <p className="font-display text-xl tabular-nums text-white">{value}</p>
        <p className="text-[11px] font-semibold text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

function ViewOverlayButton({ overlayUrl }: { overlayUrl: string }) {
  return (
    <a
      href={overlayUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={SECONDARY_BTN}
    >
      <ExternalIcon className="h-4 w-4" />
      Ver overlay
    </a>
  );
}

/* ------------------------------ Lista de juegos ------------------------------ */

function GamesCard({
  snapshot,
  isVotingPhase,
  pending,
  onVeto,
}: {
  snapshot: EventStateSnapshot;
  isVotingPhase: boolean;
  pending: string | null;
  onVeto: (suggestionId: string) => void;
}) {
  const canVeto = snapshot.event?.status === "SUGGESTIONS_ACTIVE";
  const maxVotes = Math.max(0, ...snapshot.votingOptions.map((o) => o.votes));
  const suggestionsByName = new Map(
    snapshot.suggestions.map((s) => [s.gameName, s])
  );

  return (
    <section className={CARD}>
      <div className="flex items-center justify-between border-b border-violet-500/15 px-5 py-3.5">
        <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-violet-300">
          Juegos sugeridos
        </h3>
        <span className="text-[11px] font-semibold text-zinc-500">
          Total de juegos en la lista:{" "}
          {isVotingPhase
            ? snapshot.votingOptions.length
            : snapshot.suggestions.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-4">
        {!isVotingPhase &&
          (snapshot.suggestions.length === 0 ? (
            <p className="px-1 py-3 text-sm text-zinc-500">
              Aún no hay sugerencias del chat.
            </p>
          ) : (
            snapshot.suggestions.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-[#080512] px-3 py-2.5"
              >
                <span className="flex h-8 w-8 shrink-0 -skew-x-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-violet-700">
                  <span className="skew-x-6 font-display text-sm leading-none text-white">
                    {i + 1}
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    {s.gameName}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Sugerido por: @{s.twitchLogin} · {timeAgo(s.createdAt)}
                  </p>
                </div>
                {canVeto && (
                  <button
                    type="button"
                    title="Vetar sugerencia"
                    disabled={pending !== null}
                    onClick={() => onVeto(s.id)}
                    className="shrink-0 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-red-950/60 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          ))}

        {isVotingPhase &&
          (snapshot.votingOptions.length === 0 ? (
            <p className="px-1 py-3 text-sm text-zinc-500">
              No hay opciones de voto.
            </p>
          ) : (
            snapshot.votingOptions.map((o) => {
              const isLeader = o.votes > 0 && o.votes === maxVotes;
              const suggestion = suggestionsByName.get(o.gameName);
              return (
                <div
                  key={o.id}
                  className={`rounded-xl border px-3 py-2.5 ${
                    isLeader
                      ? "border-amber-300/50 bg-amber-300/5"
                      : "border-violet-500/20 bg-[#080512]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 -skew-x-6 items-center justify-center rounded-lg ${
                        isLeader
                          ? "bg-gradient-to-br from-amber-300 to-amber-500"
                          : "bg-gradient-to-br from-violet-400 to-violet-700"
                      }`}
                    >
                      <span
                        className={`skew-x-6 font-display text-sm leading-none ${
                          isLeader ? "text-black" : "text-white"
                        }`}
                      >
                        {o.position}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-white">
                        {o.gameName}
                      </p>
                      {suggestion && (
                        <p className="text-[11px] text-zinc-500">
                          Sugerido por: @{suggestion.twitchLogin} ·{" "}
                          {timeAgo(suggestion.createdAt)}
                        </p>
                      )}
                    </div>
                    {isLeader && (
                      <CrownIcon className="h-4 w-4 shrink-0 text-amber-300" />
                    )}
                    <span className="shrink-0 font-mono text-sm font-bold tabular-nums text-zinc-200">
                      {o.votes} {o.votes === 1 ? "voto" : "votos"}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLeader ? "bg-amber-400" : "bg-violet-500"
                      }`}
                      style={{
                        width:
                          maxVotes > 0
                            ? `${(o.votes / maxVotes) * 100}%`
                            : "0%",
                      }}
                    />
                  </div>
                </div>
              );
            })
          ))}
      </div>
    </section>
  );
}

/* --------------------------- Lista de participantes --------------------------- */

function ParticipantsCard({ snapshot }: { snapshot: EventStateSnapshot }) {
  return (
    <section className={CARD}>
      <div className="flex items-center justify-between border-b border-violet-500/15 px-5 py-3.5">
        <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-violet-300">
          Participantes inscritos
        </h3>
        <span className="text-[11px] font-semibold text-zinc-500">
          Total de participantes: {snapshot.raffleParticipants.length}
        </span>
      </div>

      <div className="flex flex-col gap-2 p-4">
        {snapshot.raffleParticipants.length === 0 ? (
          <p className="px-1 py-3 text-sm text-zinc-500">
            Aún no hay participantes.
          </p>
        ) : (
          snapshot.raffleParticipants.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-[#080512] px-3 py-2.5"
            >
              <span className="flex h-8 w-8 shrink-0 -skew-x-6 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-violet-700">
                <span className="skew-x-6 font-display text-sm leading-none text-white">
                  {i + 1}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  @{p.twitchLogin}
                </p>
                <p className="text-[11px] text-zinc-500">
                  Inscrito {timeAgo(p.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/* --------------------------------- Helpers --------------------------------- */

/** Progreso 0..1 de la fase actual, recalculado cada segundo. */
function usePhaseProgress(
  phaseStartedAt: string | null | undefined,
  phaseEndsAt: string | null | undefined
): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!phaseStartedAt || !phaseEndsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phaseStartedAt, phaseEndsAt]);

  if (!phaseStartedAt || !phaseEndsAt) return null;
  const total =
    new Date(phaseEndsAt).getTime() - new Date(phaseStartedAt).getTime();
  if (total <= 0) return null;
  const elapsed = now - new Date(phaseStartedAt).getTime();
  return Math.min(1, Math.max(0, elapsed / total));
}

function timeAgo(iso: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "hace un momento";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  return `hace ${diffHours} h`;
}
