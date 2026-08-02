import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomToken } from "@/lib/auth/crypto";
import { googleAuthUrl, googleConfig, GOOGLE_STATE_COOKIE } from "@/lib/auth/google";

export async function GET() {
  const config = googleConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL("/login?error=GOOGLE_NOT_CONFIGURED", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }

  const state = randomToken(16);
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600
  });

  const authUrl = googleAuthUrl(state);
  if (!authUrl) {
    return NextResponse.redirect(
      new URL("/login?error=GOOGLE_NOT_CONFIGURED", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
    );
  }

  return NextResponse.redirect(authUrl);
}
