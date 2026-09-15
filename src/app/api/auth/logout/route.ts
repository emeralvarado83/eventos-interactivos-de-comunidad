// POST /api/auth/logout — borra la cookie de sesión y vuelve a la landing.

import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/", request.url), 303);
}
