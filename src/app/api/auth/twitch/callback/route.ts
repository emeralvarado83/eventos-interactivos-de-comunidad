// GET /api/auth/twitch/callback — retorno del flujo OAuth.
// Verifica el state anti-CSRF, intercambia el code por tokens, consulta el
// perfil del usuario, hace upsert de User + Channel y crea la sesión.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/auth/crypto";
import { setSessionCookie } from "@/lib/auth/session";
import { exchangeCodeForTokens, fetchAuthenticatedUser } from "@/lib/twitch/oauth";
import { ensureConnection } from "@/lib/twitch/eventsub";
import { OAUTH_STATE_COOKIE } from "@/app/api/auth/twitch/route";

function redirectWithError(request: NextRequest, error: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/?error=${error}`, request.url));
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // El usuario rechazó la autorización o Twitch devolvió un error.
  if (params.get("error")) {
    return redirectWithError(request, "twitch_denied");
  }

  const code = params.get("code");
  const state = params.get("state");
  const expectedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectWithError(request, "invalid_state");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const twitchUser = await fetchAuthenticatedUser(tokens.accessToken);

    const user = await db.user.upsert({
      where: { twitchId: twitchUser.id },
      update: {
        login: twitchUser.login,
        displayName: twitchUser.displayName,
        accessToken: encryptSecret(tokens.accessToken),
        refreshToken: encryptSecret(tokens.refreshToken),
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
      create: {
        twitchId: twitchUser.id,
        login: twitchUser.login,
        displayName: twitchUser.displayName,
        accessToken: encryptSecret(tokens.accessToken),
        refreshToken: encryptSecret(tokens.refreshToken),
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
      },
    });

    const channel = await db.channel.upsert({
      where: { twitchId: twitchUser.id },
      update: {},
      create: { twitchId: twitchUser.id, userId: user.id },
    });

    await setSessionCookie({
      userId: user.id,
      channelId: channel.id,
      twitchId: user.twitchId,
      login: user.login,
      displayName: user.displayName,
    });

    // Abrir la conexión EventSub del streamer sin bloquear el redirect.
    void ensureConnection(user.twitchId).catch((err) =>
      console.error("No se pudo conectar EventSub tras el login:", err)
    );

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch (err) {
    console.error("Error en el callback de OAuth:", err);
    return redirectWithError(request, "auth_failed");
  }
}
