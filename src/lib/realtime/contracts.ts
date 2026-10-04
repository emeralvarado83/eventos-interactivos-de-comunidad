// Contratos compartidos entre backend y frontend (Fases 4+).
// Este archivo es la fuente de verdad para los tipos que cruzan la frontera
// HTTP/Socket.IO: no importa nada de Prisma ni de Next para que pueda
// usarse también desde componentes cliente.

export type EventStatusName =
  | "DRAFT"
  | "SUGGESTIONS_ACTIVE"
  | "SUGGESTIONS_FINISHED"
  | "VOTING_ACTIVE"
  | "VOTING_FINISHED"
  | "TIE"
  | "COMPLETED"
  | "CANCELLED"
  // Estados del sorteo (type = RAFFLE)
  | "REGISTRATION_OPEN"
  | "REGISTRATION_CLOSED"
  | "DRAWING";

export type RoundPhaseName =
  | "SUGGESTIONS"
  | "VOTING"
  | "FINISHED"
  | "REGISTRATION";

/**
 * Identificadores internos estables de los tipos de evento. Reflejan el enum
 * EventType de Prisma; los textos visibles viven en lib/branding.ts.
 */
export type EventTypeName = "SUGGESTIONS" | "VOTING" | "RAFFLE";

export const EVENT_TYPES: readonly EventTypeName[] = [
  "SUGGESTIONS",
  "VOTING",
  "RAFFLE",
];

/** Origen de las opciones de un evento de votación (type = VOTING). */
export type OptionSourceName = "MANUAL" | "FROM_SUGGESTIONS";

export const OPTION_SOURCES: readonly OptionSourceName[] = [
  "MANUAL",
  "FROM_SUGGESTIONS",
];

/** Colores de tema seleccionables (página Configuración del canal). */
export type ThemeColorName = "violet" | "cyan" | "pink" | "red" | "green";

export const THEME_COLORS: readonly ThemeColorName[] = [
  "violet",
  "cyan",
  "pink",
  "red",
  "green",
];

/**
 * Payload de guardado de configuración (PATCH /api/events/[id]): unión
 * discriminada por tipo. Cada variante lleva solo los campos de su tipo.
 */
export type EventConfigPayload =
  | {
      type: "SUGGESTIONS";
      suggestionDurationSec: number;
    }
  | {
      type: "VOTING";
      votingDurationSec: number;
      /** Título visible de la encuesta (dashboard y overlay). */
      votingTitle: string;
      /** Tope de opciones importadas cuando optionSource = FROM_SUGGESTIONS. */
      maxOptions: number;
      optionSource: OptionSourceName;
      /** Opciones escritas por el streamer; solo si optionSource = MANUAL. */
      options?: string[];
    }
  | {
      type: "RAFFLE";
      registrationDurationSec: number;
      /** null = sin límite de participantes. */
      maxParticipants: number | null;
      /** Palabra exacta que inscribe desde el chat (case-insensitive). */
      raffleCommand: string;
    };

export interface SuggestionView {
  id: string;
  gameName: string;
  twitchLogin: string;
  createdAt: string; // ISO 8601
}

export interface VotingOptionView {
  id: string;
  /** Posición estable de votación (1..n). No cambia aunque el ranking visual se reordene. */
  position: number;
  gameName: string;
  votes: number;
}

export interface RaffleParticipantView {
  id: string;
  twitchLogin: string;
  createdAt: string; // ISO 8601
}

/** Snapshot completo del estado del evento activo de un canal. */
export interface EventStateSnapshot {
  channelId: string;
  /** Ajustes del canal (página Configuración): tema, sonido y restricciones. */
  channel: {
    themeColor: ThemeColorName;
    alertSoundEnabled: boolean;
    subsOnly: boolean;
  };
  event: {
    id: string;
    type: EventTypeName;
    status: EventStatusName;
    suggestionDurationSec: number;
    votingDurationSec: number;
    /** Título visible de la encuesta (type = VOTING), editable. */
    votingTitle: string;
    maxOptions: number;
    /** Origen de las opciones (type = VOTING). */
    optionSource: OptionSourceName;
    /** Opciones manuales del evento (type = VOTING, optionSource = MANUAL). */
    manualOptions: string[];
    /** Config del sorteo (type = RAFFLE). Duración de la inscripción. */
    registrationDurationSec: number;
    /** Config del sorteo (type = RAFFLE). null = sin límite. */
    maxParticipants: number | null;
    /** Palabra que inscribe al sorteo desde el chat (type = RAFFLE). */
    raffleCommand: string;
    /** Config de sugerencias (type = SUGGESTIONS). Siempre true: las
     * sugerencias son videojuegos validados contra IGDB. */
    igdbValidation: boolean;
    suggestionMaxLength: number;
    /** Título fijo del evento de sugerencias (dashboard y overlay). */
    suggestionTitle: string;
    /** ISO 8601; null mientras el evento no ha terminado. */
    endedAt: string | null;
  } | null;
  round: {
    id: string;
    number: number;
    phase: RoundPhaseName;
    phaseStartedAt: string | null; // ISO 8601
    /** Autoridad del tiempo: el countdown del cliente se calcula desde aquí. */
    phaseEndsAt: string | null; // ISO 8601
  } | null;
  /** Sugerencias de la ronda actual, en orden de llegada. */
  suggestions: SuggestionView[];
  /** Ordenadas por votos desc (desempate: position asc). `position` es estable. */
  votingOptions: VotingOptionView[];
  /** Posiciones empatadas en cabeza cuando status = TIE. */
  tiedPositions: number[];
  /** Ganador cuando status = COMPLETED; en VOTING_FINISHED es una vista previa pendiente de confirmar. */
  winner: { position: number; gameName: string; votes: number } | null;
  /** Participantes del sorteo (type = RAFFLE), en orden de inscripción. */
  raffleParticipants: RaffleParticipantView[];
  /**
   * Ganador del sorteo. Solo se expone cuando status = COMPLETED: durante
   * DRAWING el ganador ya existe en BD pero se oculta para no spoilear la
   * animación.
   */
  raffleWinner: { twitchLogin: string } | null;
}

// Eventos Socket.IO. El servidor emite siempre `event:state` (snapshot
// completo) tras cualquier cambio: es la fuente de verdad para el cliente.
export const SOCKET_EVENTS = {
  /** Cliente → servidor: unirse a la room de un canal. Payload: { channelId: string }. */
  JOIN: "channel:join",
  /** Servidor → cliente: snapshot completo (EventStateSnapshot). */
  STATE: "event:state",
  SUGGESTION_ADDED: "suggestion:added",
  SUGGESTION_REMOVED: "suggestion:removed",
  VOTE_UPDATED: "vote:updated",
  TIE: "event:tie",
  COMPLETED: "event:completed",
  CANCELLED: "event:cancelled",
  PARTICIPANT_ADDED: "raffle:participant-added",
} as const;
