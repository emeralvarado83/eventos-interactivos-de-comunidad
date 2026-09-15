// Guardas de autorización para route handlers (Fase 9): sesión obligatoria
// y verificación de que el recurso pertenece al canal del usuario autenticado.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BusinessError } from "@/lib/errors";
import { getSession, type SessionPayload } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentSnapshot } from "@/lib/events/service";

/** Sesión actual o null (el handler responde 401). */
export async function requireSession(): Promise<SessionPayload | null> {
  return getSession();
}

/** Evento solo si pertenece al canal de la sesión; null → 404 (no se filtra existencia). */
export async function getOwnedEvent(eventId: string, channelId: string) {
  return db.event.findFirst({ where: { id: eventId, channelId } });
}

/** Sugerencia solo si pertenece a un evento del canal de la sesión; null → 404. */
export async function getOwnedSuggestion(suggestionId: string, channelId: string) {
  const suggestion = await db.suggestion.findUnique({
    where: { id: suggestionId },
    include: { round: { include: { event: true } } },
  });
  if (!suggestion || suggestion.round.event.channelId !== channelId) return null;
  return suggestion;
}

export function unauthorized() {
  return NextResponse.json({ error: "no_authenticated" }, { status: 401 });
}

export function notFound(resource: string) {
  return NextResponse.json({ error: `${resource}_not_found` }, { status: 404 });
}

export function rateLimited() {
  return NextResponse.json({ error: "rate_limited" }, { status: 429 });
}

export function businessError(err: BusinessError) {
  return NextResponse.json({ error: err.message }, { status: 400 });
}

/**
 * Envoltura común de las acciones POST sobre un evento: sesión + rate limit +
 * propiedad del recurso + traducción de BusinessError a 400. Tras la acción
 * devuelve el snapshot actualizado del canal.
 */
export async function handleEventAction(
  eventId: string,
  action: (eventId: string) => Promise<unknown>
): Promise<NextResponse> {
  const session = await requireSession();
  if (!session) return unauthorized();
  if (!checkRateLimit(`mut:${session.userId}`)) return rateLimited();

  const event = await getOwnedEvent(eventId, session.channelId);
  if (!event) return notFound("event");

  try {
    await action(event.id);
    return NextResponse.json(await getCurrentSnapshot(session.channelId));
  } catch (err) {
    if (err instanceof BusinessError) return businessError(err);
    throw err;
  }
}
