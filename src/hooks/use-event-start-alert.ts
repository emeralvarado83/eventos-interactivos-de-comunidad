// Alerta de audio del overlay: suena cuando un evento arranca, es decir,
// cuando el estado pasa a una fase activa (sugerencias abiertas, votación
// abierta o inscripciones del sorteo). No suena al cargar la página a mitad
// de un evento: solo ante transiciones observadas en vivo.

import { useEffect, useRef } from "react";
import type { EventStatusName } from "@/lib/realtime/contracts";

const ACTIVE_STATUSES: readonly EventStatusName[] = [
  "SUGGESTIONS_ACTIVE",
  "VOTING_ACTIVE",
  "REGISTRATION_OPEN",
];

const ALERT_URL = "/alerta-evento.mp3";

export function useEventStartAlert(
  status: EventStatusName | null,
  enabled: boolean = true
): void {
  const prevStatus = useRef<EventStatusName | null>(null);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;

    if (
      enabled &&
      status !== null &&
      status !== prev &&
      ACTIVE_STATUSES.includes(status)
    ) {
      const audio = new Audio(ALERT_URL);
      void audio.play().catch(() => {
        // El navegador puede bloquear el autoplay; en la Browser Source de
        // OBS normalmente está permitido.
      });
    }
  }, [status, enabled]);
}
