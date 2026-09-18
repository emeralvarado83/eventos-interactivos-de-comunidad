// Máquina de estados de Event.status (Fase 5). Módulo PURO (sin DB) para
// poder testearla de forma aislada. Cualquier transición no listada en
// allowedTransitions es un error de negocio.

import type { EventStatusName } from "@/lib/realtime/contracts";
import { BusinessError } from "@/lib/errors";

export const allowedTransitions: Readonly<
  Record<EventStatusName, readonly EventStatusName[]>
> = {
  // DRAFT → SUGGESTIONS_ACTIVE inicia Sugerencias y votos; DRAFT →
  // REGISTRATION_OPEN inicia un Sorteo. El tipo se valida en el servicio.
  DRAFT: ["SUGGESTIONS_ACTIVE", "REGISTRATION_OPEN", "CANCELLED"],
  SUGGESTIONS_ACTIVE: ["SUGGESTIONS_FINISHED", "CANCELLED"],
  SUGGESTIONS_FINISHED: ["VOTING_ACTIVE", "CANCELLED"],
  VOTING_ACTIVE: ["VOTING_FINISHED"],
  VOTING_FINISHED: ["TIE", "COMPLETED"],
  // TIE → VOTING_ACTIVE es la extensión de +60s; TIE → SUGGESTIONS_ACTIVE es nueva ronda.
  TIE: ["VOTING_ACTIVE", "SUGGESTIONS_ACTIVE"],
  // COMPLETED → SUGGESTIONS_ACTIVE: nueva ronda (Sugerencias y votos).
  // COMPLETED → REGISTRATION_OPEN: nuevo sorteo; → DRAWING: volver a
  // sortear; → CANCELLED: finalizar evento (Sorteo).
  COMPLETED: ["SUGGESTIONS_ACTIVE", "REGISTRATION_OPEN", "DRAWING", "CANCELLED"],
  CANCELLED: [],
  // Ciclo del sorteo: inscripción → cierre → selección → completado.
  REGISTRATION_OPEN: ["REGISTRATION_CLOSED", "CANCELLED"],
  REGISTRATION_CLOSED: ["DRAWING", "CANCELLED"],
  DRAWING: ["COMPLETED"],
};

export function canTransition(
  from: EventStatusName,
  to: EventStatusName
): boolean {
  return allowedTransitions[from].includes(to);
}

/** Lanza BusinessError si la transición no está permitida. */
export function assertTransition(
  from: EventStatusName,
  to: EventStatusName
): void {
  if (!canTransition(from, to)) {
    throw new BusinessError(`Transición no permitida: ${from} → ${to}`);
  }
}
