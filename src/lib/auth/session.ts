import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/auth/crypto";

export const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "wh_session";

export function sessionExpiry() {
  const days = Number(process.env.AUTH_SESSION_DAYS || 30);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

export async function createSession(userId: string) {
  const token = randomToken();
  const tokenHash = sha256(token);
  const expiresAt = sessionExpiry();

  await prisma.authSession.create({
    data: { userId, tokenHash, expiresAt }
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    await prisma.authSession.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        include: {
          subscription: { include: { plan: true } }
        }
      }
    }
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}
