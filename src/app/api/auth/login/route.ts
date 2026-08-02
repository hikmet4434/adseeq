import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { hizSiniriAsimi } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const body = schema.parse(await req.json());
  // Sayaç e-posta bazlı da tutulur: tek IP'den farklı hesaplara saldırı da yavaşlar.
  const sinir = hizSiniriAsimi(req, "giris", body.email.trim().toLowerCase());
  if (sinir) return sinir;

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user?.passwordHash) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
