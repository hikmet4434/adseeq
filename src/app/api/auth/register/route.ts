import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { isConfiguredAdminEmail } from "@/lib/admin-emails";
import { hizSiniriAsimi } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional()
});

export async function POST(req: Request) {
  // Sahte hesap seli = ücretsiz plan kotası tüketimi (doğrudan maliyet).
  const sinir = hizSiniriAsimi(req, "kayit");
  if (sinir) return sinir;

  const body = schema.parse(await req.json());
  const email = body.email.trim().toLowerCase();
  const isAdmin = isConfiguredAdminEmail(email);
  const plan = await prisma.plan.findUnique({ where: { code: isAdmin ? "PREMIUM" : "FREE" } });
  if (!plan) return NextResponse.json({ error: "PLAN_NOT_SEEDED" }, { status: 500 });

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      email,
      name: body.name || email.split("@")[0],
      passwordHash: await bcrypt.hash(body.password, 10),
      role: isAdmin ? UserRole.ADMIN : UserRole.USER,
      subscription: { create: { planId: plan.id, status: "ACTIVE" } }
    }
  });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
