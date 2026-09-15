// Parseo y validación del body JSON de configuración de eventos, compartido
// por POST /api/events y PATCH /api/events/[id]. Las rutas no pueden
// exportar helpers (Next solo admite los métodos HTTP), por eso vive aquí.

import { BusinessError } from "@/lib/errors";

export interface EventConfigInput {
  suggestionDurationSec?: number;
  votingDurationSec?: number;
  maxGames?: number;
}

export function parseEventConfig(body: unknown): EventConfigInput {
  if (body === null || body === undefined) return {};
  if (typeof body !== "object" || Array.isArray(body)) {
    throw new BusinessError("El body debe ser un objeto JSON");
  }
  const { suggestionDurationSec, votingDurationSec, maxGames } =
    body as Record<string, unknown>;
  for (const [name, value] of [
    ["suggestionDurationSec", suggestionDurationSec],
    ["votingDurationSec", votingDurationSec],
  ] as const) {
    if (
      value !== undefined &&
      (typeof value !== "number" || !Number.isInteger(value) || value < 10 || value > 3600)
    ) {
      throw new BusinessError(`${name} debe ser un entero entre 10 y 3600`);
    }
  }
  if (
    maxGames !== undefined &&
    (typeof maxGames !== "number" || !Number.isInteger(maxGames) || maxGames < 1 || maxGames > 50)
  ) {
    throw new BusinessError("maxGames debe ser un entero entre 1 y 50");
  }
  return {
    suggestionDurationSec: suggestionDurationSec as number | undefined,
    votingDurationSec: votingDurationSec as number | undefined,
    maxGames: maxGames as number | undefined,
  };
}
