import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { isConfiguredAdminEmail } from "@/lib/admin-emails";
import { exchangeGoogleCode, fetchGoogleProfile, GOOGLE_STATE_COOKIE } from "@/lib/auth/google";

function redirectToLogin(error: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(error)}`, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return redirectToLogin(oauthError);

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToLogin("GOOGLE_STATE_MISMATCH");
  }

  let tokens;
  try {
    tokens = await exchangeGoogleCode(code);
  } catch (err) {
    console.error("[google/callback] token exchange failed:", err);
    return redirectToLogin("GOOGLE_AUTH_FAILED");
  }

  let profile;
  try {
    profile = await fetchGoogleProfile(tokens.access_token);
  } catch (err) {
    console.error("[google/callback] profile fetch failed:", err);
    return redirectToLogin("GOOGLE_AUTH_FAILED");
  }

  if (!profile.sub) return redirectToLogin("GOOGLE_AUTH_FAILED");

  const email = (profile.email || "").trim().toLowerCase();
  if (!email) return redirectToLogin("GOOGLE_EMAIL_REQUIRED");

  const isAdmin = isConfiguredAdminEmail(email);
  const plan = await prisma.plan.findUnique({ where: { code: isAdmin ? "PREMIUM" : "FREE" } });

  let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  if (!user) {
    user = await prisma.user.findUnique({ where: { email } });
  }

  if (!user) {
    if (!plan) return redirectToLogin("PLAN_NOT_SEEDED");
    user = await prisma.user.create({
      data: {
        email,
        googleId: profile.sub,
        name: profile.name || email.split("@")[0],
        avatarUrl: profile.picture || null,
        locale: profile.locale || "tr",
        role: isAdmin ? UserRole.ADMIN : UserRole.USER,
        lastLoginAt: new Date(),
        subscription: { create: { planId: plan.id, status: "ACTIVE" } }
      }
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: user.googleId || profile.sub,
        name: user.name || profile.name || null,
        avatarUrl: user.avatarUrl || profile.picture || null,
        role: isAdmin ? UserRole.ADMIN : user.role,
        lastLoginAt: new Date()
      }
    });

    if (isAdmin) {
      if (!plan) return redirectToLogin("PLAN_NOT_SEEDED");
      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: { planId: plan.id, status: "ACTIVE", cancelAtPeriodEnd: false },
        create: { userId: user.id, planId: plan.id, status: "ACTIVE" }
      });
    }
  }

  await createSession(user.id);
  return NextResponse.redirect(
    new URL("/dashboard/ads", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")
  );
}
