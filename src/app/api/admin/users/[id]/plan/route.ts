import { PlanCode, SubscriptionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin, requestAuditContext } from "@/lib/admin-api";
import { prisma } from "@/lib/db";

const schema = z.object({ planCode: z.nativeEnum(PlanCode), status: z.nativeEnum(SubscriptionStatus).default(SubscriptionStatus.ACTIVE) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getApiAdmin();
  if (!actor) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const { id } = await params;
  const [target, plan] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { subscription: { include: { plan: true } } } }),
    prisma.plan.findUnique({ where: { code: parsed.data.planCode } })
  ]);
  if (!target) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  if (!plan) return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
  const auditContext = requestAuditContext(request);
  await prisma.$transaction([
    prisma.subscription.upsert({ where: { userId: id }, update: { planId: plan.id, status: parsed.data.status, cancelAtPeriodEnd: false }, create: { userId: id, planId: plan.id, status: parsed.data.status } }),
    prisma.adminAuditLog.create({
      data: {
        actorId: actor.id, actorEmail: actor.email, action: "PLAN_CHANGED", targetType: "User", targetId: id,
        summary: `${target.email} planı ${target.subscription?.plan.code || "YOK"} → ${plan.code} olarak değiştirildi.`,
        details: { before: target.subscription?.plan.code || null, after: plan.code, status: parsed.data.status }, ...auditContext
      }
    })
  ]);
  return NextResponse.json({ ok: true, plan: plan.code, status: parsed.data.status });
}
