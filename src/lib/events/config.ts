// Parseo y validación del body JSON de configuración de eventos, compartido
// por POST /api/events y PATCH /api/events/[id]. Las rutas no pueden
// exportar helpers (Next solo admite los métodos HTTP), por eso vive aquí.

import { BusinessError } from "@/lib/errors";
import { EVENT_TYPES, type EventTypeName } from "@/lib/realtime/contracts";

export interface EventConfigInput {
  type?: EventTypeName;
  suggestionDurationSec?: number;
  votingDurationSec?: number;
  maxGames?: number;
  registrationDurationSec?: number;
  /** null explícito = sin límite de participantes. */
  maxParticipants?: number | null;
}

function isValidDuration(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 10 &&
    value <= 3600
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
    maxGames,
    registrationDurationSec,
    maxParticipants,
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
    maxGames !== undefined &&
    (typeof maxGames !== "number" || !Number.isInteger(maxGames) || maxGames < 1 || maxGames > 50)
  ) {
    throw new BusinessError("maxGames debe ser un entero entre 1 y 50");
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

  return {
    type: type as EventTypeName | undefined,
    suggestionDurationSec: suggestionDurationSec as number | undefined,
    votingDurationSec: votingDurationSec as number | undefined,
    maxGames: maxGames as number | undefined,
    registrationDurationSec: registrationDurationSec as number | undefined,
    maxParticipants:
      maxParticipants === undefined
        ? undefined
        : (maxParticipants as number | null),
  };
}
