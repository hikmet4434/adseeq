import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional()
});

export async function POST(req: Request) {
  const body = schema.parse(await req.json());
  const free = await prisma.plan.findUnique({ where: { code: "FREE" } });
  if (!free) return NextResponse.json({ error: "PLAN_NOT_SEEDED" }, { status: 500 });

  const exists = await prisma.user.findUnique({ where: { email: body.email } });
  if (exists) return NextResponse.json({ error: "EMAIL_EXISTS" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name || body.email.split("@")[0],
      passwordHash: await bcrypt.hash(body.password, 10),
      subscription: { create: { planId: free.id, status: "ACTIVE" } }
    }
  });
  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
