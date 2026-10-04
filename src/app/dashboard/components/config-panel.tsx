"use client";

import { useState } from "react";
import {
  EVENT_TYPES,
  OPTION_SOURCES,
  type EventConfigPayload,
  type EventTypeName,
  type OptionSourceName,
} from "@/lib/realtime/contracts";
import { EVENT_TYPE_META, FROM_SUGGESTIONS_VOTING_TITLE } from "@/lib/branding";
import {
  MAX_COMMAND_LENGTH,
  MAX_EVENT_TITLE_LENGTH,
} from "@/lib/events/config";

interface ConfigPanelProps {
  eventId: string | null;
  type: EventTypeName;
  suggestionDurationSec: number;
  votingDurationSec: number;
  /** Título de la encuesta (type = VOTING), editable. */
  votingTitle: string;
  maxOptions: number;
  optionSource: OptionSourceName;
  manualOptions: string[];
  registrationDurationSec: number;
  maxParticipants: number | null;
  /** Palabra de inscripción del sorteo (type = RAFFLE). */
  raffleCommand: string;
  /** Solo editable mientras el evento está en DRAFT. */
  editable: boolean;
  pending: boolean;
  onSave: (config: EventConfigPayload) => void;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-violet-500/25 bg-[#080512] px-3 py-2 text-sm font-semibold text-white outline-none transition-colors focus:border-violet-400/60 disabled:cursor-not-allowed disabled:opacity-50";

// Las flechas nativas del input numérico no se pueden estilizar de forma
// fiable entre navegadores, así que se ocultan y se usan botones propios.
const DURATION_INPUT_CLASS = `${INPUT_CLASS} pr-24 [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden`;

/** Input de duración en minutos con botones de subir/bajar acordes al tema. */
function DurationInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (minutes: number) => void;
  disabled: boolean;
}) {
  function step(delta: number) {
    onChange(Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, value + delta)));
  }
  const stepBtn =
    "flex h-3.5 w-5 items-center justify-center text-[9px] leading-none text-zinc-500 transition-colors hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <span className="relative">
      <input
        type="number"
        min={MIN_MINUTES}
        max={MAX_MINUTES}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={DURATION_INPUT_CLASS}
      />
      <span className="absolute top-1/2 right-10 flex -translate-y-1/2 flex-col">
        <button
          type="button"
          title="Subir"
          disabled={disabled || value >= MAX_MINUTES}
          onClick={() => step(1)}
          className={stepBtn}
        >
          ▲
        </button>
        <button
          type="button"
          title="Bajar"
          disabled={disabled || value <= MIN_MINUTES}
          onClick={() => step(-1)}
          className={stepBtn}
        >
          ▼
        </button>
      </span>
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-bold text-zinc-600">
        minutos
      </span>
    </span>
  );
}

/** Valor provisional del input de participantes cuando el límite está en "Sin límite". */
const DEFAULT_MAX_PARTICIPANTS = 100;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 50;
const MAX_OPTION_LENGTH = 60;
// Las duraciones se muestran en minutos; la API y la BD trabajan en segundos.
const MIN_MINUTES = 1;
const MAX_MINUTES = 60;

const OPTION_SOURCE_META: Record<OptionSourceName, { label: string; hint: string }> = {
  MANUAL: {
    label: "Opciones manuales",
    hint: "Escribe tú la lista de opciones de la encuesta.",
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
  votingTitle,
  maxOptions,
  optionSource,
  manualOptions,
  registrationDurationSec,
  maxParticipants,
  raffleCommand,
  editable,
  pending,
  onSave,
}: ConfigPanelProps) {
  const [selectedType, setSelectedType] = useState(type);
  const [suggestionMin, setSuggestionMin] = useState(
    Math.round(suggestionDurationSec / 60)
  );
  const [votingMin, setVotingMin] = useState(
    Math.round(votingDurationSec / 60)
  );
  const [pollTitle, setPollTitle] = useState(votingTitle);
  // Último título escrito en modo manual; se restaura al volver a ese origen.
  const [manualTitle, setManualTitle] = useState(votingTitle);
  const [maxOpts, setMaxOpts] = useState(maxOptions);
  const [source, setSource] = useState<OptionSourceName>(optionSource);
  const [options, setOptions] = useState<string[]>(manualOptions);
  const [newOption, setNewOption] = useState("");
  const [registrationMin, setRegistrationMin] = useState(
    Math.round(registrationDurationSec / 60)
  );
  const [unlimited, setUnlimited] = useState(maxParticipants === null);
  const [participants, setParticipants] = useState(
    maxParticipants ?? DEFAULT_MAX_PARTICIPANTS
  );
  const [command, setCommand] = useState(raffleCommand);
  const [prevProps, setPrevProps] = useState({
    type,
    suggestionDurationSec,
    votingDurationSec,
    votingTitle,
    maxOptions,
    optionSource,
    manualOptionsKey: manualOptions.join(""),
    registrationDurationSec,
    maxParticipants,
    raffleCommand,
  });

  // Resincroniza los inputs cuando el snapshot cambia (ajuste durante el render).
  const manualOptionsKey = manualOptions.join("");
  if (
    prevProps.type !== type ||
    prevProps.suggestionDurationSec !== suggestionDurationSec ||
    prevProps.votingDurationSec !== votingDurationSec ||
    prevProps.votingTitle !== votingTitle ||
    prevProps.maxOptions !== maxOptions ||
    prevProps.optionSource !== optionSource ||
    prevProps.manualOptionsKey !== manualOptionsKey ||
    prevProps.registrationDurationSec !== registrationDurationSec ||
    prevProps.maxParticipants !== maxParticipants ||
    prevProps.raffleCommand !== raffleCommand
  ) {
    setPrevProps({
      type,
      suggestionDurationSec,
      votingDurationSec,
      votingTitle,
      maxOptions,
      optionSource,
      manualOptionsKey,
      registrationDurationSec,
      maxParticipants,
      raffleCommand,
    });
    setSelectedType(type);
    setSuggestionMin(Math.round(suggestionDurationSec / 60));
    setVotingMin(Math.round(votingDurationSec / 60));
    setPollTitle(votingTitle);
    setManualTitle(votingTitle);
    setMaxOpts(maxOptions);
    setSource(optionSource);
    setOptions(manualOptions);
    setNewOption("");
    setRegistrationMin(Math.round(registrationDurationSec / 60));
    setUnlimited(maxParticipants === null);
    setParticipants(maxParticipants ?? DEFAULT_MAX_PARTICIPANTS);
    setCommand(raffleCommand);
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

  const commandValid =
    command.trim().length >= 2 &&
    command.trim().length <= MAX_COMMAND_LENGTH &&
    !/\s/.test(command.trim());

  const pollTitleValid =
    pollTitle.trim().length >= 2 &&
    pollTitle.trim().length <= MAX_EVENT_TITLE_LENGTH;

  const canSave =
    (selectedType !== "VOTING" ||
      (pollTitleValid && (source !== "MANUAL" || optionsValid))) &&
    (selectedType !== "RAFFLE" || commandValid);

  function save() {
    if (selectedType === "RAFFLE") {
      onSave({
        type: "RAFFLE",
        registrationDurationSec: registrationMin * 60,
        maxParticipants: unlimited ? null : participants,
        raffleCommand: command.trim().toLowerCase(),
      });
    } else if (selectedType === "VOTING") {
      onSave({
        type: "VOTING",
        votingDurationSec: votingMin * 60,
        votingTitle: pollTitle.trim(),
        maxOptions: maxOpts,
        optionSource: source,
        ...(source === "MANUAL" ? { options: cleanOptions } : {}),
      });
    } else {
      onSave({
        type: "SUGGESTIONS",
        suggestionDurationSec: suggestionMin * 60,
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
          <DurationInput
            value={suggestionMin}
            onChange={setSuggestionMin}
            disabled={!editable}
          />
        </label>
      )}

      {selectedType === "VOTING" && (
        <>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-400">
            Título de la encuesta
            <input
              type="text"
              maxLength={MAX_EVENT_TITLE_LENGTH}
              disabled={!editable || source === "FROM_SUGGESTIONS"}
              value={pollTitle}
              onChange={(e) => setPollTitle(e.target.value)}
              className={INPUT_CLASS}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-400">
            Duración de la encuesta
            <DurationInput
              value={votingMin}
              onChange={setVotingMin}
              disabled={!editable}
            />
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
                    onClick={() => {
                      if (s === source) return;
                      if (s === "FROM_SUGGESTIONS") {
                        // Guarda el título manual y fija el de sugerencias.
                        setManualTitle(pollTitle);
                        setPollTitle(FROM_SUGGESTIONS_VOTING_TITLE);
                      } else {
                        setPollTitle(manualTitle);
                      }
                      setSource(s);
                    }}
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
                Opciones de la encuesta{" "}
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
            <DurationInput
              value={registrationMin}
              onChange={setRegistrationMin}
              disabled={!editable}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-400">
            Palabra de inscripción
            <input
              type="text"
              maxLength={MAX_COMMAND_LENGTH}
              disabled={!editable}
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              className={INPUT_CLASS}
            />
            <span className="text-[11px] font-medium text-zinc-600">
              Una sola palabra (2-{MAX_COMMAND_LENGTH} caracteres). El chat se
              inscribe escribiéndola tal cual.
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
