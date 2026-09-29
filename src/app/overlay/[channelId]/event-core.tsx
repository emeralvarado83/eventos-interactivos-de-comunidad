// Event Core: HUD de videojuego para el estado de espera del overlay.
// Sustituye a la antigua píldora "Esperando evento…" por un núcleo
// tecnológico animado (anillos, scan, partículas) que hereda la identidad
// visual violeta del sistema. Todo el movimiento es CSS (transform/opacity)
// para que la Browser Source de OBS lo renderice sin coste.
//
// Estados:
//   idle       → loop de standby (~8s): actividad de anillos, scan, partículas.
//   activating → el núcleo carga energía y se desvanece expandiéndose; el
//                overlay lo muestra ~1s justo antes de revelar el evento.

type EventCoreState = "idle" | "activating";

export function EventCore({ state = "idle" }: { state?: EventCoreState }) {
  const activating = state === "activating";
  return (
    <div
      className={`event-core overlay-rise${activating ? " event-core--activating" : ""}`}
      role="status"
      aria-label={activating ? "Evento detectado" : "Esperando evento"}
    >
      {/* Esquinas del marco HUD */}
      <span aria-hidden className="event-core__corner event-core__corner--tl" />
      <span aria-hidden className="event-core__corner event-core__corner--tr" />
      <span aria-hidden className="event-core__corner event-core__corner--bl" />
      <span aria-hidden className="event-core__corner event-core__corner--br" />

      {/* Etiquetas laterales del HUD */}
      <span aria-hidden className="event-core__tag event-core__tag--left">
        SYS·ONLINE
      </span>
      <span aria-hidden className="event-core__tag event-core__tag--right">
        STANDBY
      </span>

      <div className="event-core__nucleus">
        <svg
          aria-hidden
          viewBox="0 0 120 120"
          className="event-core__rings"
          fill="none"
        >
          <circle className="event-core__ring event-core__ring--outer" cx="60" cy="60" r="52" />
          <circle className="event-core__ring event-core__ring--mid" cx="60" cy="60" r="42" />
          <circle className="event-core__ring event-core__ring--inner" cx="60" cy="60" r="33" />
        </svg>

        <span aria-hidden className="event-core__scan" />

        <div className="event-core__orb">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-6 w-6"
          >
            <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
          </svg>
        </div>

        <span aria-hidden className="event-core__particle event-core__particle--1" />
        <span aria-hidden className="event-core__particle event-core__particle--2" />
        <span aria-hidden className="event-core__particle event-core__particle--3" />
        <span aria-hidden className="event-core__particle event-core__particle--4" />
      </div>

      <p className="event-core__label">
        {activating ? "Evento detectado" : "Esperando evento"}
        {!activating && (
          <span aria-hidden className="event-core__dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        )}
      </p>
    </div>
  );
}
