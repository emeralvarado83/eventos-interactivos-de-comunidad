// Alerta de audio del overlay: suena cuando se revela un ganador, es decir,
// cuando el evento pasa a COMPLETED con un ganador visible (encuesta,
// sugerencias o sorteo). No suena si el evento termina sin participación
// (winner null) ni en la vista previa de VOTING_FINISHED: solo ante la
// revelación definitiva observada en vivo.

import { useEffect, useRef } from "react";

const ALERT_URL = "/alerta-victoria.mp3";

export function useWinnerAlert(
  winnerRevealed: boolean,
  enabled: boolean = true
): void {
  const prevRevealed = useRef(false);

  useEffect(() => {
    const prev = prevRevealed.current;
    prevRevealed.current = winnerRevealed;

    if (enabled && winnerRevealed && !prev) {
      const audio = new Audio(ALERT_URL);
      void audio.play().catch(() => {
        // El navegador puede bloquear el autoplay; en la Browser Source de
        // OBS normalmente está permitido.
      });
    }
  }, [winnerRevealed, enabled]);
}
