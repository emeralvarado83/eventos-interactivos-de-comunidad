// Parseo y validación del body JSON de configuración de eventos, compartido
// por POST /api/events y PATCH /api/events/[id]. Las rutas no pueden
// exportar helpers (Next solo admite los métodos HTTP), por eso vive aquí.

import { BusinessError } from "@/lib/errors";
import {
  EVENT_TYPES,
  OPTION_SOURCES,
  type EventTypeName,
  type OptionSourceName,
} from "@/lib/realtime/contracts";

export interface EventConfigInput {
  type?: EventTypeName;
  suggestionDurationSec?: number;
  votingDurationSec?: number;
  /** Título visible de la encuesta (type = VOTING). */
  votingTitle?: string;
  maxOptions?: number;
  optionSource?: OptionSourceName;
  /** Opciones manuales de un evento VOTING (optionSource = MANUAL). */
  options?: string[];
  registrationDurationSec?: number;
  /** null explícito = sin límite de participantes. */
  maxParticipants?: number | null;
  /** Palabra exacta que inscribe al sorteo (una palabra, 2-20 caracteres). */
  raffleCommand?: string;
}

/** Longitud máxima fija del texto de una sugerencia (no configurable). */
export const SUGGESTION_TEXT_MAX_LENGTH = 100;
export const MIN_EVENT_TITLE_LENGTH = 2;
export const MAX_EVENT_TITLE_LENGTH = 40;
export const MIN_COMMAND_LENGTH = 2;
export const MAX_COMMAND_LENGTH = 20;

function isValidDuration(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 10 &&
    value <= 3600
  );
}

export function isValidOptionLabel(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length >= 2 &&
    value.trim().length <= 60
  );
}

export function parseEventConfig(body: unknown): EventConfigInput {
  if (body === null || body === undefined) return {};
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new BusinessError("El body debe ser un objeto JSON");
  }
  const {
    type,
    suggestionDurationSec,
    votingDurationSec,
    votingTitle,
    maxOptions,
    optionSource,
    options,
    registrationDurationSec,
    maxParticipants,
    raffleCommand,
  } = body as Record<string, unknown>;

  if (
    type !== undefined &&
    (typeof type !== "string" ||
      !(EVENT_TYPES as readonly string[]).includes(type))
  ) {
    throw new BusinessError(
      `type debe ser uno de: ${EVENT_TYPES.join(", ")}`
    );
  }

  for (const [name, value] of [
    ["suggestionDurationSec", suggestionDurationSec],
    ["votingDurationSec", votingDurationSec],
    ["registrationDurationSec", registrationDurationSec],
  ] as const) {
    if (value !== undefined && !isValidDuration(value)) {
      throw new BusinessError(`${name} debe ser un entero entre 10 y 3600`);
    }
  }

  if (
    maxOptions !== undefined &&
    (typeof maxOptions !== "number" ||
      !Number.isInteger(maxOptions) ||
      maxOptions < 1 ||
      maxOptions > 50)
  ) {
    throw new BusinessError("maxOptions debe ser un entero entre 1 y 50");
  }

  if (
    optionSource !== undefined &&
    (typeof optionSource !== "string" ||
      !(OPTION_SOURCES as readonly string[]).includes(optionSource))
  ) {
    throw new BusinessError(
      `optionSource debe ser uno de: ${OPTION_SOURCES.join(", ")}`
    );
  }

  if (options !== undefined) {
    if (!Array.isArray(options)) {
      throw new BusinessError("options debe ser un array de textos");
    }
    if (options.length < 2 || options.length > 50) {
      throw new BusinessError("options debe tener entre 2 y 50 opciones");
    }
    const seen = new Set<string>();
    for (const option of options) {
      if (!isValidOptionLabel(option)) {
        throw new BusinessError(
          "Cada opción debe ser un texto de entre 2 y 60 caracteres"
        );
      }
      const normalized = (option as string).trim().toLowerCase();
      if (seen.has(normalized)) {
        throw new BusinessError("Las opciones no pueden estar duplicadas");
      }
      seen.add(normalized);
    }
  }

  if (
    maxParticipants !== undefined &&
    maxParticipants !== null &&
    (typeof maxParticipants !== "number" ||
      !Number.isInteger(maxParticipants) ||
      maxParticipants < 1 ||
      maxParticipants > 10000)
  ) {
    throw new BusinessError(
      "maxParticipants debe ser un entero entre 1 y 10000, o null (sin límite)"
    );
  }

  let cleanVotingTitle: string | undefined;
  if (votingTitle !== undefined) {
    if (typeof votingTitle !== "string") {
      throw new BusinessError("votingTitle debe ser un texto");
    }
    cleanVotingTitle = votingTitle.trim();
    if (
      cleanVotingTitle.length < MIN_EVENT_TITLE_LENGTH ||
      cleanVotingTitle.length > MAX_EVENT_TITLE_LENGTH
    ) {
      throw new BusinessError(
        `votingTitle debe tener entre ${MIN_EVENT_TITLE_LENGTH} y ${MAX_EVENT_TITLE_LENGTH} caracteres`
      );
    }
  }

  let cleanCommand: string | undefined;
  if (raffleCommand !== undefined) {
    if (typeof raffleCommand !== "string") {
      throw new BusinessError("raffleCommand debe ser un texto");
    }
    cleanCommand = raffleCommand.trim().toLowerCase();
    if (
      cleanCommand.length < MIN_COMMAND_LENGTH ||
      cleanCommand.length > MAX_COMMAND_LENGTH ||
      /\s/.test(cleanCommand)
    ) {
      throw new BusinessError(
        `raffleCommand debe ser una sola palabra de entre ${MIN_COMMAND_LENGTH} y ${MAX_COMMAND_LENGTH} caracteres`
      );
    }
  }

  return {
    type: type as EventTypeName | undefined,
    suggestionDurationSec: suggestionDurationSec as number | undefined,
    votingDurationSec: votingDurationSec as number | undefined,
    votingTitle: cleanVotingTitle,
    maxOptions: maxOptions as number | undefined,
    optionSource: optionSource as OptionSourceName | undefined,
    options:
      options === undefined
        ? undefined
        : (options as string[]).map((o) => o.trim()),
    registrationDurationSec: registrationDurationSec as number | undefined,
    maxParticipants:
      maxParticipants === undefined
        ? undefined
        : (maxParticipants as number | null),
    raffleCommand: cleanCommand,
  };
}
