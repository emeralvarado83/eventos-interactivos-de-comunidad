"use client";

import { useEffect, type ReactNode } from "react";
import { useChannelSocket } from "@/hooks/use-channel-socket";
import { formatCountdown, useCountdown } from "@/hooks/use-countdown";
import type { VotingOptionView } from "@/lib/realtime/contracts";

const MAX_RECENT_SUGGESTIONS = 8;

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

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}

function HeaderBanner({ countdown }: { countdown: number | null }) {
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
            <span className="text-white">¿QUÉ </span>
            <span className="text-violet-400">JUGAMOS</span>
            <span className="text-white"> HOY?</span>
          </h1>
          <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.3em] text-violet-200/70">
            Sugiere un juego • Vota por tu favorito
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
  gameCount,
  children,
}: {
  title: string;
  gameCount?: number;
  children: ReactNode;
}) {
  return (
    <section className="overlay-rise overflow-hidden rounded-2xl border border-violet-500/40 bg-[#0c0718]/92 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-between border-b border-violet-500/25 px-4 py-2.5">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-violet-300">
          <CrownIcon className="h-4 w-4" />
          {title}
        </p>
        {gameCount !== undefined && (
          <span className="flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-violet-200">
            <UsersIcon className="h-3 w-3" />
            {gameCount} {gameCount === 1 ? "juego" : "juegos"}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-3">{children}</div>
    </section>
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

function InstructionsFooter({ phase }: { phase: "suggest" | "vote" }) {
  return (
    <footer className="overlay-rise flex divide-x divide-violet-500/25 rounded-2xl border border-violet-500/40 bg-[#0c0718]/92 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
      {phase === "suggest" ? (
        <FooterItem
          icon={<ChatIcon className="h-5 w-5" />}
          title="Para sugerir"
          description="Escribe el nombre del juego en el chat"
        />
      ) : (
        <FooterItem
          icon={<HashIcon className="h-5 w-5" />}
          title="Para votar"
          description="Escribe el número de tu juego favorito"
        />
      )}
    </footer>
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

  const status = snapshot?.event?.status ?? null;
  const phaseEndsAt = snapshot?.round?.phaseEndsAt ?? null;
  const countdown = useCountdown(phaseEndsAt);

  const maxVotes = snapshot
    ? Math.max(0, ...snapshot.votingOptions.map((o) => o.votes))
    : 0;

  return (
    <div
      className="flex w-[460px] flex-col gap-3 p-4 font-sans"
      style={{ background: "transparent" }}
    >
      {status === "SUGGESTIONS_ACTIVE" && snapshot && (
        <>
          <HeaderBanner countdown={countdown} />
          <Panel
            title="Sugerencias recientes"
            gameCount={snapshot.suggestions.length}
          >
            {snapshot.suggestions.length === 0 ? (
              <p className="px-1 py-2 text-sm font-semibold text-violet-200/70">
                Aún no hay sugerencias. ¡Sé la primera persona en proponer un
                juego!
              </p>
            ) : (
              snapshot.suggestions
                .slice(-MAX_RECENT_SUGGESTIONS)
                .reverse()
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-[#120c22] to-[#0d0819] px-3 py-2"
                  >
                    <ChatIcon className="h-4 w-4 shrink-0 text-violet-300" />
                    <p className="min-w-0 flex-1 truncate text-base font-bold text-white">
                      {s.gameName}
                      <span className="ml-2 text-sm font-semibold text-violet-300/70">
                        @{s.twitchLogin}
                      </span>
                    </p>
                  </div>
                ))
            )}
          </Panel>
          <InstructionsFooter phase="suggest" />
        </>
      )}

      {status === "VOTING_ACTIVE" && snapshot && (
        <>
          <HeaderBanner countdown={countdown} />
          <Panel
            title="Lista de sugerencias"
            gameCount={snapshot.votingOptions.length}
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

      {(status === "SUGGESTIONS_FINISHED" || status === "VOTING_FINISHED") && (
        <>
          <HeaderBanner countdown={null} />
          <Panel
            title={
              status === "SUGGESTIONS_FINISHED"
                ? "Sugerencias cerradas"
                : "Votación cerrada"
            }
          >
            <p className="px-1 py-2 text-lg font-extrabold text-white">
              {status === "SUGGESTIONS_FINISHED"
                ? "¡Preparando la votación!"
                : "¡Contando votos!"}
            </p>
          </Panel>
        </>
      )}

      {status === "TIE" && snapshot && (
        <>
          <HeaderBanner countdown={countdown} />
          <section className="overlay-rise overflow-hidden rounded-2xl border border-amber-300/60 bg-[#0c0718]/92 shadow-[0_12px_40px_rgba(0,0,0,0.7)]">
            <div className="border-b border-amber-300/25 px-4 py-2.5">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-amber-300">
                ¡Empate! Se extiende la votación
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

      {status === "COMPLETED" && snapshot?.winner && (
        <>
          <HeaderBanner countdown={null} />
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

      {(status === null || status === "DRAFT" || status === "CANCELLED") && (
        <p className="overlay-rise inline-flex w-fit items-center gap-2 rounded-full border border-violet-500/40 bg-[#0c0718]/92 px-4 py-2 text-sm font-bold text-violet-200/80">
          <BoltIcon className="h-4 w-4 text-violet-300" />
          Esperando evento…
        </p>
      )}
    </div>
  );
}
