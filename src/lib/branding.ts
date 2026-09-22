// Textos de marca del producto, centralizados para poder ajustarlos
// fácilmente.

import type { EventTypeName } from "@/lib/realtime/contracts";

export const BRAND_NAME = "E.I.C";
export const BRAND_TAGLINE = "Eventos Interactivos de Comunidad";

/**
 * Registro de los tipos de evento: textos visibles asociados a cada
 * EventTypeName. Para añadir un tipo nuevo basta con extender el enum de
 * Prisma, EventTypeName y esta tabla (más su configuración específica).
 */
export const EVENT_TYPE_META: Record<
  EventTypeName,
  {
    /** Nombre visible del tipo ("Evento actual · …"). */
    label: string;
    /** Texto del botón de inicio cuando el evento está en DRAFT. */
    startLabel: string;
    /** Título grande de la tarjeta del evento. */
    title: string;
  }
> = {
  SUGGESTIONS: {
    label: "Sugerencias",
    startLabel: "Iniciar sugerencias",
    title: "¿Qué sugiere el chat?",
  },
  VOTING: {
    label: "Votación",
    startLabel: "Iniciar votación",
    title: "Votación",
  },
  RAFFLE: {
    label: "Sorteo",
    startLabel: "Iniciar sorteo",
    title: "Sorteo",
  },
};
