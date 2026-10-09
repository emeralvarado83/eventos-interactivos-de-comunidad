"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useChannelSocket } from "@/hooks/use-channel-socket";
import { formatCountdown, useCountdown } from "@/hooks/use-countdown";
import { useEventStartAlert } from "@/hooks/use-event-start-alert";
import { EventCore } from "./event-core";
import type {
  EventTypeName,
  RaffleParticipantView,
  SuggestionView,
  VotingOptionView,
} from "@/lib/realtime/contracts";


function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-1.6 10.5H4.6L3 8z" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-7 1.7-7 4.5V20h14v-1.5c0-2.8-3.7-4.5-7-4.5z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 11a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 9 11zm7 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm-7 2c-2.8 0-6 1.4-6 3.8V19h12v-2.2c0-2.4-3.2-3.8-6-3.8zm7 .8c-.5 0-1 .1-1.5.2a4.7 4.7 0 0 1 1.5 3.4V19h4v-1.9c0-2-2.2-3.3-4-3.3z" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M4 3h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-5l-4 4v-4H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M9 3L7 21M17 3l-2 18M4 8h17M3 16h17" />
    </svg>
  );
}

function GamepadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M21.58 16.09l-1.09-7.66A3.996 3.996 0 0 0 16.53 5H7.47C5.48 5 3.79 6.46 3.51 8.43l-1.09 7.66C2.2 17.63 3.39 19 4.94 19c.68 0 1.32-.27 1.8-.75L9 16h6l2.25 2.25c.48.48 1.13.75 1.8.75 1.56 0 2.75-1.37 2.53-2.91zM11 11H9v2H8v-2H6v-1h2V8h1v2h2v1zm4-1c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm2 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

function HeaderBanner({
  countdown,
  title,
  subtitle,
}: {
  countdown: number | null;
  title: ReactNode;
  subtitle: string;
}) {
  return (
    <header className="overlay-rise relative -rotate-1">
      <div
        aria-hidden
        className="absolute -top-2 right-8 h-8 w-1.5 rotate-[30deg] rounded-full bg-violet-500"
      />
      <div
        aria-hidden
        className="absolute -bottom-2 left-6 h-8 w-1.5 rotate-[30deg] rounded-full bg-violet-500"
      />
      <div
        aria-hidden
        className="absolute -top-1 left-14 h-5 w-1 rotate-[30deg] rounded-full bg-violet-400/70"
      />
      <div className="relative flex items-center justify-between gap-4 rounded-2xl border border-violet-400/50 bg-gradient-to-r from-[#2a1450] via-[#180c31] to-[#0d0819] px-5 py-3 shadow-[0_10px_35px_rgba(0,0,0,0.65)]">
        <div>
          <h1 className="font-display text-[27px] leading-none tracking-tight">
            {title}
          </h1>
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-violet-200/70">
            {subtitle}
          </p>
        </div>
        {countdown !== null && (
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-violet-400/50 bg-black/50 px-3 py-2">
            <BoltIcon className="h-4 w-4 text-violet-300" />
            <span className="font-display text-2xl leading-none tabular-nums text-white">
              {formatCountdown(countdown)}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

function Panel({
  title,
  count,
  countNoun,
  countIcon,
  children,
}: {
  title: string;
  count?: number;
  /** Etiqueta del contador: ["juego", "juegos"], ["participante", "participantes"]. */
  countNoun?: [string, string];
  /** Icono de la píldora del contador; por defecto UsersIcon. */
  countIcon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overlay-rise overflow-hidden rounded-2xl border border-violet-500/40 bg-[#0c0718]/92 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-between border-b border-violet-500/25 px-4 py-2.5">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-violet-300">
          <CrownIcon className="h-4 w-4" />
          {title}
        </p>
        {count !== undefined && countNoun && (
          <span className="flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-violet-200">
            {countIcon ?? <UsersIcon className="h-3 w-3" />}
            {count} {count === 1 ? countNoun[0] : countNoun[1]}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-3">{children}</div>
    </section>
  );
}

/**
 * Lista tipo chat: los elementos más recientes van abajo y, cuando el
 * contenido supera el alto máximo, los primeros se van desplazando fuera de
 * vista. Mantiene el auto-scroll al final salvo que el usuario suba
 * manualmente; basta con volver abajo para reengancharse.
 */
function ScrollableFeed({
  itemCount,
  emptyMessage,
  children,
}: {
  itemCount: number;
  emptyMessage: string;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const list = listRef.current;
    if (list && stickToBottomRef.current) {
      list.scrollTop = list.scrollHeight;
    }
  }, [itemCount]);

  if (itemCount === 0) {
    return (
      <p className="px-1 py-2 text-sm font-semibold text-violet-200/70">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      ref={listRef}
      onScroll={(e) => {
        const list = e.currentTarget;
        stickToBottomRef.current =
          list.scrollHeight - list.scrollTop - list.clientHeight < 24;
      }}
      className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1"
    >
      {children}
    </div>
  );
}

function SuggestionRow({ suggestion }: { suggestion: SuggestionView }) {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-[#120c22] to-[#0d0819] px-3 py-2">
      <ChatIcon className="h-4 w-4 shrink-0 text-violet-300" />
      <p className="min-w-0 flex-1 truncate text-base font-bold text-white">
        {suggestion.gameName}
        <span className="ml-2 text-sm font-semibold text-violet-300/70">
          @{suggestion.twitchLogin}
        </span>
      </p>
    </div>
  );
}

function ParticipantRow({
  participant,
}: {
  participant: RaffleParticipantView;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-[#120c22] to-[#0d0819] px-3 py-2">
      <PersonIcon className="h-4 w-4 shrink-0 text-violet-300" />
      <p className="min-w-0 flex-1 truncate text-base font-bold text-white">
        @{participant.twitchLogin}
      </p>
    </div>
  );
}

function VotingRow({
  option,
  isLeader,
}: {
  option: VotingOptionView;
  isLeader: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
        isLeader
          ? "overlay-leader-glow border-amber-300/80 bg-gradient-to-r from-amber-400/15 via-[#151027] to-[#0d0819]"
          : "border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-[#120c22] to-[#0d0819]"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 -skew-x-6 items-center justify-center rounded-lg shadow-[0_3px_10px_rgba(0,0,0,0.5)] ${
          isLeader
            ? "bg-gradient-to-br from-amber-300 to-amber-500 text-black"
            : "bg-gradient-to-br from-violet-400 to-violet-700 text-white"
        }`}
      >
        <span className="skew-x-6 font-display text-xl leading-none">
          {option.position}
        </span>
      </span>
      {isLeader && <CrownIcon className="h-5 w-5 shrink-0 text-amber-300" />}
      <p className="min-w-0 flex-1 truncate text-lg font-extrabold text-white">
        {option.gameName}
      </p>
      <div className="flex shrink-0 items-center gap-2 border-l border-violet-500/30 pl-3">
        <PersonIcon className="h-4 w-4 text-violet-300" />
        <div className="text-right leading-none">
          <p className="font-display text-2xl tabular-nums text-white">
            {option.votes}
          </p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-violet-300/80">
            {option.votes === 1 ? "voto" : "votos"}
          </p>
        </div>
      </div>
    </div>
  );
}

function FooterItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/50 bg-violet-500/15 text-violet-300">
        {icon}
      </span>
      <div className="leading-tight">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300">
          {title}
        </p>
        <p className="mt-0.5 text-sm font-semibold text-white/90">
          {description}
        </p>
      </div>
    </div>
  );
}

function InstructionsFooter({
  phase,
  suggestDescription = "Escribe el nombre del juego en el chat",
  participateDescription = "Escribe participo en el chat",
}: {
  phase: "suggest" | "vote" | "participate";
  /** Texto de la instrucción de sugerir. */
  suggestDescription?: string;
  /** Texto de la instrucción de participar (lleva la palabra del sorteo). */
  participateDescription?: string;
}) {
  return (
    <footer className="overlay-rise flex divide-x divide-violet-500/25 rounded-2xl border border-violet-500/40 bg-[#0c0718]/92 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
      {phase === "suggest" ? (
        <FooterItem
          icon={<ChatIcon className="h-5 w-5" />}
          title="Para sugerir"
          description={suggestDescription}
        />
      ) : phase === "participate" ? (
        <FooterItem
          icon={<ChatIcon className="h-5 w-5" />}
          title="Para participar"
          description={participateDescription}
        />
      ) : (
        <FooterItem
          icon={<HashIcon className="h-5 w-5" />}
          title="Para votar"
          description="Escribe el número de tu opción favorita"
        />
      )}
    </footer>
  );
}

const VOTING_SUBTITLE = "Vota por tu opción favorita";
const RAFFLE_TITLE = <span className="text-violet-400">SORTEO</span>;
const RAFFLE_SUBTITLE = "Participa y gana";

const SUGGEST_SUBTITLE = "Escribe el nombre del juego en el chat";

/**
 * Título del evento (definido en la config): se muestra en mayúsculas con
 * la última palabra en el color del tema, como el "¿QUÉ JUGAMOS?" original.
 */
function eventTitleNode(title: string): ReactNode {
  const words = title.trim().toUpperCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return <span className="text-white">?</span>;
  const last = words[words.length - 1];
  const rest = words.slice(0, -1).join(" ");
  return (
    <>
      {rest && <span className="text-white">{rest} </span>}
      <span className="text-violet-400">{last}</span>
    </>
  );
}

/**
 * Título de cabecera de las fases de votación: el título de la encuesta en
 * eventos VOTING y el título fijo del evento en SUGGESTIONS.
 */
function phaseTitleNode(event: {
  type: EventTypeName;
  votingTitle: string;
  suggestionTitle: string;
}): ReactNode {
  return eventTitleNode(
    event.type === "VOTING" ? event.votingTitle : event.suggestionTitle
  );
}

/** Animación "🎰 Seleccionando ganador…": cicla nombres hasta que llega COMPLETED. */
function RaffleDrawingAnimation({
  participants,
}: {
  participants: RaffleParticipantView[];
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (participants.length === 0) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % participants.length),
      80
    );
    return () => clearInterval(id);
  }, [participants.length]);

  const current = participants[index % Math.max(1, participants.length)];

  return (
    <section className="overlay-rise overflow-hidden rounded-2xl border border-violet-400/60 bg-gradient-to-b from-[#241843] to-[#0c0718] px-6 py-8 text-center shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
      <p className="text-[11px] font-black uppercase tracking-[0.35em] text-violet-300">
        🎰 Seleccionando ganador…
      </p>
      <p className="mt-4 font-display text-3xl leading-tight text-white">
        {current ? `@${current.twitchLogin}` : "…"}
      </p>
    </section>
  );
}

export function OverlayClient({ channelId }: { channelId: string }) {
  const { snapshot } = useChannelSocket({
    channelId,
    fallbackUrl: `/api/overlay/${channelId}`,
  });

  // Fondo transparente para la Browser Source de OBS.
  useEffect(() => {
    const { body, documentElement } = document;
    const prevBody = body.style.background;
    const prevHtml = documentElement.style.background;
    body.style.background = "transparent";
    documentElement.style.background = "transparent";
    return () => {
      body.style.background = prevBody;
      documentElement.style.background = prevHtml;
    };
  }, []);

  const liveStatus = snapshot?.event?.status ?? null;
  useEventStartAlert(liveStatus, snapshot?.channel.alertSoundEnabled ?? true);

  // Transición "evento detectado": cuando el estado pasa de idle (sin
  // evento, DRAFT o CANCELLED) a una fase activa, el Event Core ejecuta
  // su animación de carga durante ~1.1s antes de revelar el evento.
  // Mientras `activating` es true, `status` se fuerza a null para que
  // ningún panel de evento se renderice todavía.
  const [activating, setActivating] = useState(false);
  const wasIdleRef = useRef(false);
  useEffect(() => {
    const isIdle =
      liveStatus === null ||
      liveStatus === "DRAFT" ||
      liveStatus === "CANCELLED";
    if (isIdle) {
      wasIdleRef.current = true;
      return;
    }
    if (wasIdleRef.current) {
      wasIdleRef.current = false;
      setActivating(true);
      const timeout = window.setTimeout(() => setActivating(false), 1100);
      return () => window.clearTimeout(timeout);
    }
  }, [liveStatus]);

  const status = activating ? null : liveStatus;
  const phaseEndsAt = snapshot?.round?.phaseEndsAt ?? null;
  const countdown = useCountdown(phaseEndsAt);

  const maxVotes = snapshot
    ? Math.max(0, ...snapshot.votingOptions.map((o) => o.votes))
    : 0;

  return (
    <div
      data-theme={snapshot?.channel.themeColor ?? "violet"}
      className="flex w-[460px] flex-col gap-3 p-4 font-sans"
      style={{ background: "transparent" }}
    >
      {status === "SUGGESTIONS_ACTIVE" && snapshot && snapshot.event && (
        <>
          <HeaderBanner
            countdown={countdown}
            title={eventTitleNode(snapshot.event.suggestionTitle)}
            subtitle={SUGGEST_SUBTITLE}
          />
          <Panel
            title="Sugerencias"
            count={snapshot.suggestions.length}
            countNoun={["juego", "juegos"]}
            countIcon={<GamepadIcon className="h-3 w-3" />}
          >
            <ScrollableFeed
              itemCount={snapshot.suggestions.length}
              emptyMessage="Aún no hay sugerencias. ¡Sé la primera persona en proponer un juego!"
            >
              {snapshot.suggestions.map((s) => (
                <SuggestionRow key={s.id} suggestion={s} />
              ))}
            </ScrollableFeed>
          </Panel>
          <InstructionsFooter
            phase="suggest"
            suggestDescription={SUGGEST_SUBTITLE}
          />
        </>
      )}

      {status === "VOTING_ACTIVE" && snapshot && snapshot.event && (
        <>
          <HeaderBanner
            countdown={countdown}
            title={phaseTitleNode(snapshot.event)}
            subtitle={VOTING_SUBTITLE}
          />
          <Panel
            title="Opciones de voto"
            count={snapshot.votingOptions.length}
            countNoun={["opción", "opciones"]}
          >
            {snapshot.votingOptions.map((o) => (
              <VotingRow
                key={o.id}
                option={o}
                isLeader={o.votes > 0 && o.votes === maxVotes}
              />
            ))}
          </Panel>
          <InstructionsFooter phase="vote" />
        </>
      )}

      {status === "SUGGESTIONS_FINISHED" && snapshot && snapshot.event && (
        <>
          <HeaderBanner
            countdown={null}
            title={phaseTitleNode(snapshot.event)}
            subtitle={SUGGEST_SUBTITLE}
          />
          <Panel
            title="Sugerencias cerradas"
            count={snapshot.suggestions.length}
            countNoun={["juego", "juegos"]}
            countIcon={<GamepadIcon className="h-3 w-3" />}
          >
            <ScrollableFeed
              itemCount={snapshot.suggestions.length}
              emptyMessage="No se recibieron sugerencias."
            >
              {snapshot.suggestions.map((s) => (
                <SuggestionRow key={s.id} suggestion={s} />
              ))}
            </ScrollableFeed>
          </Panel>
        </>
      )}

      {status === "VOTING_FINISHED" && snapshot && snapshot.event && (
        <>
          <HeaderBanner
            countdown={null}
            title={phaseTitleNode(snapshot.event)}
            subtitle={VOTING_SUBTITLE}
          />
          <Panel
            title="Encuesta cerrada"
            count={snapshot.votingOptions.length}
            countNoun={["opción", "opciones"]}
          >
            {snapshot.votingOptions.map((o) => (
              <VotingRow
                key={o.id}
                option={o}
                isLeader={o.votes > 0 && o.votes === maxVotes}
              />
            ))}
          </Panel>
        </>
      )}

      {status === "TIE" && snapshot && snapshot.event && (
        <>
          <HeaderBanner
            countdown={countdown}
            title={phaseTitleNode(snapshot.event)}
            subtitle={VOTING_SUBTITLE}
          />
          <section className="overlay-rise overflow-hidden rounded-2xl border border-amber-300/60 bg-[#0c0718]/92 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
            <div className="border-b border-amber-300/25 px-4 py-2.5">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-300">
                ¡Empate! Se extiende la encuesta
              </p>
            </div>
            <div className="flex flex-col gap-2 p-3">
              {snapshot.tiedPositions.map((position) => {
                const option = snapshot.votingOptions.find(
                  (o) => o.position === position
                );
                return (
                  <div
                    key={position}
                    className="flex items-center gap-3 rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-400/10 to-[#0d0819] px-3 py-2"
                  >
                    <span className="flex h-9 w-9 shrink-0 -skew-x-6 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-black">
                      <span className="skew-x-6 font-display text-lg leading-none">
                        {position}
                      </span>
                    </span>
                    <p className="min-w-0 flex-1 truncate text-lg font-extrabold text-white">
                      {option?.gameName ?? "?"}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
          <InstructionsFooter phase="vote" />
        </>
      )}

      {status === "COMPLETED" && snapshot?.winner && snapshot.event && (
        <>
          <HeaderBanner
            countdown={null}
            title={phaseTitleNode(snapshot.event)}
            subtitle={VOTING_SUBTITLE}
          />
          <section className="overlay-leader-glow overlay-rise rounded-2xl border border-amber-300/70 bg-gradient-to-b from-[#241843] to-[#0c0718] px-6 py-6 text-center">
            <CrownIcon className="mx-auto h-9 w-9 text-amber-300" />
            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.35em] text-amber-300">
              ¡Tenemos ganador!
            </p>
            <p className="mt-3 font-display text-3xl leading-tight text-white">
              <span className="text-violet-400">
                #{snapshot.winner.position}
              </span>{" "}
              {snapshot.winner.gameName}
            </p>
            <p className="mt-2 text-sm font-bold text-violet-200/80">
              {snapshot.winner.votes}{" "}
              {snapshot.winner.votes === 1 ? "voto" : "votos"}
            </p>
          </section>
        </>
      )}

      {status === "REGISTRATION_OPEN" && snapshot && (
        <>
          <HeaderBanner
            countdown={countdown}
            title={RAFFLE_TITLE}
            subtitle={RAFFLE_SUBTITLE}
          />
          <Panel
            title="Participantes"
            count={snapshot.raffleParticipants.length}
            countNoun={["participante", "participantes"]}
          >
            <ScrollableFeed
              itemCount={snapshot.raffleParticipants.length}
              emptyMessage="Aún no hay participantes. ¡Sé la primera persona en participar!"
            >
              {snapshot.raffleParticipants.map((p) => (
                <ParticipantRow key={p.id} participant={p} />
              ))}
            </ScrollableFeed>
          </Panel>
          <InstructionsFooter
            phase="participate"
            participateDescription={
              snapshot.event
                ? `Escribe ${snapshot.event.raffleCommand} en el chat`
                : undefined
            }
          />
        </>
      )}

      {status === "REGISTRATION_CLOSED" && snapshot && (
        <>
          <HeaderBanner
            countdown={null}
            title={RAFFLE_TITLE}
            subtitle={RAFFLE_SUBTITLE}
          />
          <Panel
            title="Inscripciones cerradas"
            count={snapshot.raffleParticipants.length}
            countNoun={["participante", "participantes"]}
          >
            <ScrollableFeed
              itemCount={snapshot.raffleParticipants.length}
              emptyMessage="No se recibieron participantes."
            >
              {snapshot.raffleParticipants.map((p) => (
                <ParticipantRow key={p.id} participant={p} />
              ))}
            </ScrollableFeed>
          </Panel>
        </>
      )}

      {status === "DRAWING" && snapshot && (
        <RaffleDrawingAnimation participants={snapshot.raffleParticipants} />
      )}

      {status === "COMPLETED" && snapshot?.raffleWinner && (
        <>
          <HeaderBanner
            countdown={null}
            title={RAFFLE_TITLE}
            subtitle={RAFFLE_SUBTITLE}
          />
          <section className="overlay-leader-glow overlay-rise rounded-2xl border border-amber-300/70 bg-gradient-to-b from-[#241843] to-[#0c0718] px-6 py-6 text-center">
            <CrownIcon className="mx-auto h-9 w-9 text-amber-300" />
            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.35em] text-amber-300">
              🎉 ¡Ganador!
            </p>
            <p className="mt-3 font-display text-3xl leading-tight text-white">
              🏆 @{snapshot.raffleWinner.twitchLogin}
            </p>
            <p className="mt-2 text-sm font-bold text-violet-200/80">
              {snapshot.raffleParticipants.length}{" "}
              {snapshot.raffleParticipants.length === 1
                ? "participante"
                : "participantes"}
            </p>
          </section>
        </>
      )}

      {(status === null || status === "DRAFT" || status === "CANCELLED") && (
        <EventCore state={activating ? "activating" : "idle"} />
      )}
    </div>
  );
}
