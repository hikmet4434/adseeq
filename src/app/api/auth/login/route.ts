import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  const body = schema.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user?.passwordHash) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
