import { PaymentStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin, requestAuditContext } from "@/lib/admin-api";
import { prisma } from "@/lib/db";

const schema = z.object({ status: z.nativeEnum(PaymentStatus) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getApiAdmin();
  if (!actor) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id }, include: { user: { select: { email: true } } } });
  if (!payment) return NextResponse.json({ error: "PAYMENT_NOT_FOUND" }, { status: 404 });
  const auditContext = requestAuditContext(request);
  await prisma.$transaction([
    prisma.payment.update({ where: { id }, data: { status: parsed.data.status, paidAt: parsed.data.status === PaymentStatus.PAID ? payment.paidAt || new Date() : payment.paidAt } }),
    prisma.adminAuditLog.create({
      data: {
        actorId: actor.id, actorEmail: actor.email, action: "PAYMENT_STATUS_CHANGED", targetType: "Payment", targetId: id,
        summary: `${payment.user.email} ödeme durumu ${payment.status} → ${parsed.data.status} olarak değiştirildi.`,
        details: { before: payment.status, after: parsed.data.status }, ...auditContext
      }
    })
  ]);
  return NextResponse.json({ ok: true, status: parsed.data.status });
}
