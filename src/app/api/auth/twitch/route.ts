// GET /api/auth/twitch — inicio del flujo OAuth.
// Genera un state anti-CSRF, lo guarda en cookie httpOnly y redirige a Twitch.

import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/twitch/oauth";
import { config } from "@/lib/config";

export const OAUTH_STATE_COOKIE = "twitch_oauth_state";
const STATE_MAX_AGE_SEC = 60 * 10; // 10 minutos

export async function GET(request: NextRequest) {
  try {
    const state = randomBytes(32).toString("hex");
    const response = NextResponse.redirect(buildAuthorizeUrl(state));
    response.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      path: "/",
      maxAge: STATE_MAX_AGE_SEC,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/?error=auth_config", request.url));
  }
}
