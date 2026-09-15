"use client";

import { useState } from "react";
interface ConfigPanelProps {
  eventId: string | null;
  suggestionDurationSec: number;
  votingDurationSec: number;
  maxGames: number;
  /** Solo editable mientras el evento está en DRAFT. */
  editable: boolean;
  pending: boolean;
  onSave: (config: {
    suggestionDurationSec: number;
    votingDurationSec: number;
    maxGames: number;
  }) => void;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-violet-500/25 bg-[#080512] px-3 py-2 text-sm font-semibold text-white outline-none transition-colors focus:border-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50";

export function ConfigPanel(props: ConfigPanelProps) {
  return (
    <section className="rounded-2xl border border-violet-500/20 bg-[#0c0718]/80">
      <div className="border-b border-violet-500/15 px-4 py-3">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-300">
          Configuración del evento
        </h3>
      </div>
      {props.eventId ? (
        <ConfigForm key={props.eventId} {...props} />
      ) : (
        <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
          <p className="text-sm font-bold text-white">Próximo evento</p>
          <p className="text-xs text-zinc-500">
            La configuración se define al crear el evento y puede ajustarse
            antes de iniciarlo.
          </p>
        </div>
      )}
    </section>
  );
}

function ConfigForm({
  suggestionDurationSec,
  votingDurationSec,
  maxGames,
  editable,
  pending,
  onSave,
}: ConfigPanelProps) {
  const [suggestionSec, setSuggestionSec] = useState(suggestionDurationSec);
  const [votingSec, setVotingSec] = useState(votingDurationSec);
  const [games, setGames] = useState(maxGames);
  const [prevProps, setPrevProps] = useState({
    suggestionDurationSec,
    votingDurationSec,
    maxGames,
  });

  // Resincroniza los inputs cuando el snapshot cambia (ajuste durante el render).
  if (
    prevProps.suggestionDurationSec !== suggestionDurationSec ||
    prevProps.votingDurationSec !== votingDurationSec ||
    prevProps.maxGames !== maxGames
  ) {
    setPrevProps({ suggestionDurationSec, votingDurationSec, maxGames });
    setSuggestionSec(suggestionDurationSec);
    setVotingSec(votingDurationSec);
    setGames(maxGames);
  }

  function save() {
    onSave({
      suggestionDurationSec: suggestionSec,
      votingDurationSec: votingSec,
      maxGames: games,
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-400">
          Duración de sugerencias
          <span className="relative">
            <input
              type="number"
              min={10}
              max={3600}
              disabled={!editable}
              value={suggestionSec}
              onChange={(e) => setSuggestionSec(Number(e.target.value))}
              className={INPUT_CLASS}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
              segundos
            </span>
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-400">
          Duración de votación
          <span className="relative">
            <input
              type="number"
              min={10}
              max={3600}
              disabled={!editable}
              value={votingSec}
              onChange={(e) => setVotingSec(Number(e.target.value))}
              className={INPUT_CLASS}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
              segundos
            </span>
          </span>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-400">
        Máximo de juegos en la votación
        <input
          type="number"
          min={1}
          max={50}
          disabled={!editable}
          value={games}
          onChange={(e) => setGames(Number(e.target.value))}
          className={INPUT_CLASS}
        />
      </label>

      {editable ? (
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar configuración"}
        </button>
      ) : (
        <p className="rounded-lg border border-zinc-700/60 bg-zinc-900/40 px-3 py-2 text-[11px] font-medium text-zinc-500">
          La configuración solo puede editarse antes de iniciar el evento.
        </p>
      )}
    </div>
  );
}
