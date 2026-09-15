// Cliente OAuth de Twitch (Authorization Code Flow), implementado a mano
// sobre fetch. También incluye la consulta del perfil del usuario y el
// refresco del access token (lo necesitará el listener de EventSub).

import { config } from "@/lib/config";

const AUTHORIZE_URL = "https://id.twitch.tv/oauth2/authorize";
const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const USERS_URL = "https://api.twitch.tv/helix/users";

// Scopes del user access token del streamer. user:read:chat es necesario
// para la suscripción EventSub channel.chat.message (Fase 4+).
export const TWITCH_SCOPES = ["user:read:chat"];

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.twitchClientId,
    redirect_uri: config.twitchRedirectUri,
    response_type: "code",
    scope: TWITCH_SCOPES.join(" "),
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export interface TwitchTokenResponse {
  accessToken: string;
  refreshToken: string;
  /** Segundos de validez del access token devueltos por Twitch. */
  expiresIn: number;
}

async function requestToken(body: URLSearchParams): Promise<TwitchTokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Error al pedir token a Twitch (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

export function exchangeCodeForTokens(code: string): Promise<TwitchTokenResponse> {
  return requestToken(
    new URLSearchParams({
      client_id: config.twitchClientId,
      client_secret: config.twitchClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: config.twitchRedirectUri,
    })
  );
}

export function refreshAccessToken(refreshToken: string): Promise<TwitchTokenResponse> {
  return requestToken(
    new URLSearchParams({
      client_id: config.twitchClientId,
      client_secret: config.twitchClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    })
  );
}

export interface TwitchUser {
  id: string;
  login: string;
  displayName: string;
}

/** Devuelve el perfil del propietario del access token (GET /helix/users sin parámetros). */
export async function fetchAuthenticatedUser(accessToken: string): Promise<TwitchUser> {
  const res = await fetch(USERS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Client-Id": config.twitchClientId,
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Error al consultar el usuario en Twitch (${res.status}): ${detail}`);
  }
  const data = (await res.json()) as {
    data: Array<{ id: string; login: string; display_name: string }>;
  };
  const user = data.data[0];
  if (!user) {
    throw new Error("Twitch no devolvió ningún usuario para el token proporcionado");
  }
  return { id: user.id, login: user.login, displayName: user.display_name };
}
