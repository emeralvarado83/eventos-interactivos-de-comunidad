"use client";

import { useState } from "react";
import {
  EVENT_TYPES,
  OPTION_SOURCES,
  type EventConfigPayload,
  type EventTypeName,
  type OptionSourceName,
} from "@/lib/realtime/contracts";
import { EVENT_TYPE_META } from "@/lib/branding";

interface ConfigPanelProps {
  eventId: string | null;
  type: EventTypeName;
  suggestionDurationSec: number;
  votingDurationSec: number;
  maxOptions: number;
  optionSource: OptionSourceName;
  manualOptions: string[];
  registrationDurationSec: number;
  maxParticipants: number | null;
  /** Solo editable mientras el evento está en DRAFT. */
  editable: boolean;
  pending: boolean;
  onSave: (config: EventConfigPayload) => void;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-violet-500/25 bg-[#080512] px-3 py-2 text-sm font-semibold text-white outline-none transition-colors focus:border-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50";

/** Valor provisional del input de participantes cuando el límite está en "Sin límite". */
const DEFAULT_MAX_PARTICIPANTS = 100;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 50;
const MAX_OPTION_LENGTH = 60;

const OPTION_SOURCE_META: Record<OptionSourceName, { label: string; hint: string }> = {
  MANUAL: {
    label: "Opciones manuales",
    hint: "Escribe tú la lista de opciones de la votación.",
  },
  FROM_SUGGESTIONS: {
    label: "Desde sugerencias",
    hint: "Importa las sugerencias del último evento de sugerencias finalizado.",
  },
};

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
  type,
  suggestionDurationSec,
  votingDurationSec,
  maxOptions,
  optionSource,
  manualOptions,
  registrationDurationSec,
  maxParticipants,
  editable,
  pending,
  onSave,
}: ConfigPanelProps) {
  const [selectedType, setSelectedType] = useState(type);
  const [suggestionSec, setSuggestionSec] = useState(suggestionDurationSec);
  const [votingSec, setVotingSec] = useState(votingDurationSec);
  const [maxOpts, setMaxOpts] = useState(maxOptions);
  const [source, setSource] = useState<OptionSourceName>(optionSource);
  const [options, setOptions] = useState<string[]>(manualOptions);
  const [newOption, setNewOption] = useState("");
  const [registrationSec, setRegistrationSec] = useState(
    registrationDurationSec
  );
  const [unlimited, setUnlimited] = useState(maxParticipants === null);
  const [participants, setParticipants] = useState(
    maxParticipants ?? DEFAULT_MAX_PARTICIPANTS
  );
  const [prevProps, setPrevProps] = useState({
    type,
    suggestionDurationSec,
    votingDurationSec,
    maxOptions,
    optionSource,
    manualOptionsKey: manualOptions.join(""),
    registrationDurationSec,
    maxParticipants,
  });

  // Resincroniza los inputs cuando el snapshot cambia (ajuste durante el render).
  const manualOptionsKey = manualOptions.join("");
  if (
    prevProps.type !== type ||
    prevProps.suggestionDurationSec !== suggestionDurationSec ||
    prevProps.votingDurationSec !== votingDurationSec ||
    prevProps.maxOptions !== maxOptions ||
    prevProps.optionSource !== optionSource ||
    prevProps.manualOptionsKey !== manualOptionsKey ||
    prevProps.registrationDurationSec !== registrationDurationSec ||
    prevProps.maxParticipants !== maxParticipants
  ) {
    setPrevProps({
      type,
      suggestionDurationSec,
      votingDurationSec,
      maxOptions,
      optionSource,
      manualOptionsKey,
      registrationDurationSec,
      maxParticipants,
    });
    setSelectedType(type);
    setSuggestionSec(suggestionDurationSec);
    setVotingSec(votingDurationSec);
    setMaxOpts(maxOptions);
    setSource(optionSource);
    setOptions(manualOptions);
    setNewOption("");
    setRegistrationSec(registrationDurationSec);
    setUnlimited(maxParticipants === null);
    setParticipants(maxParticipants ?? DEFAULT_MAX_PARTICIPANTS);
  }

  function addOption() {
    const label = newOption.trim();
    if (!label || options.length >= MAX_OPTIONS) return;
    setOptions([...options, label]);
    setNewOption("");
  }

  function removeOption(index: number) {
    setOptions(options.filter((_, i) => i !== index));
  }

  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
  const normalized = cleanOptions.map((o) => o.toLowerCase());
  const optionsValid =
    cleanOptions.length >= MIN_OPTIONS &&
    cleanOptions.length <= MAX_OPTIONS &&
    cleanOptions.every((o) => o.length >= 2 && o.length <= MAX_OPTION_LENGTH) &&
    new Set(normalized).size === normalized.length;

  const canSave =
    selectedType !== "VOTING" || source !== "MANUAL" || optionsValid;

  function save() {
    if (selectedType === "RAFFLE") {
      onSave({
        type: "RAFFLE",
        registrationDurationSec: registrationSec,
        maxParticipants: unlimited ? null : participants,
      });
    } else if (selectedType === "VOTING") {
      onSave({
        type: "VOTING",
        votingDurationSec: votingSec,
        maxOptions: maxOpts,
        optionSource: source,
        ...(source === "MANUAL" ? { options: cleanOptions } : {}),
      });
    } else {
      onSave({
        type: "SUGGESTIONS",
        suggestionDurationSec: suggestionSec,
      });
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-zinc-400">
          Tipo de evento
        </span>
        <div className="grid grid-cols-3 gap-2">
          {EVENT_TYPES.map((t) => {
            const selected = t === selectedType;
            return (
              <button
                key={t}
                type="button"
                disabled={!editable}
                aria-pressed={selected}
                onClick={() => setSelectedType(t)}
                className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? "border-violet-400/70 bg-violet-500/20 text-white"
                    : "border-violet-500/25 bg-[#080512] text-zinc-400 hover:border-violet-400/50 hover:text-violet-200"
                }`}
              >
                {EVENT_TYPE_META[t].label}
              </button>
            );
          })}
        </div>
      </div>

      {selectedType === "SUGGESTIONS" && (
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
      )}

      {selectedType === "VOTING" && (
        <>
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

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-400">
              Origen de las opciones
            </span>
            <div className="grid grid-cols-2 gap-2">
              {OPTION_SOURCES.map((s) => {
                const selected = s === source;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={!editable}
                    aria-pressed={selected}
                    onClick={() => setSource(s)}
                    className={`rounded-xl border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      selected
                        ? "border-violet-400/70 bg-violet-500/20"
                        : "border-violet-500/25 bg-[#080512] hover:border-violet-400/50"
                    }`}
                  >
                    <span
                      className={`block text-sm font-bold ${
                        selected ? "text-white" : "text-zinc-300"
                      }`}
                    >
                      {OPTION_SOURCE_META[s].label}
                    </span>
                    <span className="mt-0.5 block text-[11px] font-medium text-zinc-500">
                      {OPTION_SOURCE_META[s].hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {source === "MANUAL" ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-zinc-400">
                Opciones de la votación{" "}
                <span className="font-medium text-zinc-600">
                  ({cleanOptions.length}/{MAX_OPTIONS} · mínimo {MIN_OPTIONS})
                </span>
              </span>
              {options.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {options.map((option, i) => (
                    <li
                      key={`${i}-${option}`}
                      className="flex items-center gap-2 rounded-lg border border-violet-500/20 bg-[#080512] px-3 py-1.5"
                    >
                      <span className="w-5 shrink-0 font-mono text-[11px] font-bold text-violet-300">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
                        {option}
                      </span>
                      <button
                        type="button"
                        title="Quitar opción"
                        disabled={!editable}
                        onClick={() => removeOption(i)}
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-zinc-500 transition-colors hover:bg-red-950/60 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={MAX_OPTION_LENGTH}
                  placeholder="Texto de la opción"
                  disabled={!editable || options.length >= MAX_OPTIONS}
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addOption();
                    }
                  }}
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  disabled={
                    !editable ||
                    newOption.trim().length < 2 ||
                    options.length >= MAX_OPTIONS
                  }
                  onClick={addOption}
                  className="shrink-0 rounded-lg border border-violet-500/40 px-3 py-2 text-sm font-bold text-violet-200 transition-colors hover:border-violet-400/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Añadir
                </button>
              </div>
              {source === "MANUAL" && !optionsValid && options.length > 0 && (
                <p className="text-[11px] font-medium text-amber-300">
                  Cada opción debe tener entre 2 y {MAX_OPTION_LENGTH}{" "}
                  caracteres, sin duplicados.
                </p>
              )}
            </div>
          ) : (
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-400">
              Máximo de opciones importadas
              <input
                type="number"
                min={1}
                max={MAX_OPTIONS}
                disabled={!editable}
                value={maxOpts}
                onChange={(e) => setMaxOpts(Number(e.target.value))}
                className={INPUT_CLASS}
              />
            </label>
          )}
        </>
      )}

      {selectedType === "RAFFLE" && (
        <>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-400">
            Duración de inscripción
            <span className="relative">
              <input
                type="number"
                min={10}
                max={3600}
                disabled={!editable}
                value={registrationSec}
                onChange={(e) => setRegistrationSec(Number(e.target.value))}
                className={INPUT_CLASS}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
                segundos
              </span>
            </span>
          </label>
          <div className="flex flex-col gap-1.5">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-400">
              Máximo de participantes
              <input
                type="number"
                min={1}
                max={10000}
                disabled={!editable || unlimited}
                value={participants}
                onChange={(e) => setParticipants(Number(e.target.value))}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-zinc-400">
              <input
                type="checkbox"
                checked={unlimited}
                disabled={!editable}
                onChange={(e) => setUnlimited(e.target.checked)}
                className="h-4 w-4 accent-violet-500 disabled:cursor-not-allowed"
              />
              Sin límite de participantes
            </label>
          </div>
        </>
      )}

      {editable ? (
        <button
          type="button"
          disabled={pending || !canSave}
          title={
            !canSave
              ? `Añade al menos ${MIN_OPTIONS} opciones válidas (2-${MAX_OPTION_LENGTH} caracteres, sin duplicados)`
              : undefined
          }
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
