// Sesión de usuario: JWT firmado (HS256) en cookie httpOnly.
// El payload mínimo identifica al usuario y su canal; los tokens de Twitch
// nunca viajan en la sesión (viven cifrados en la tabla users).

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { config } from "@/lib/config";

export const SESSION_COOKIE = "twitch_events_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 días

export interface SessionPayload {
  userId: string;
  channelId: string;
  twitchId: string;
  login: string;
  displayName: string;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(config.sessionSecret);
}

export async function createSessionToken(
  payload: SessionPayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: payload.sub as string,
      channelId: payload.channelId as string,
      twitchId: payload.twitchId as string,
      login: payload.login as string,
      displayName: payload.displayName as string,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.isProduction,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Lee y verifica la sesión actual; null si no hay cookie o es inválida. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
