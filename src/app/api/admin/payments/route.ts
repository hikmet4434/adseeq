import { CreditTransactionType, PaymentStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin, requestAuditContext } from "@/lib/admin-api";
import { prisma } from "@/lib/db";

const schema = z.object({
  userId: z.string().min(1), amountCents: z.coerce.number().int().positive().max(100_000_000),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  description: z.string().trim().max(240).optional().default("Manuel ödeme"),
  externalId: z.string().trim().max(120).optional().nullable(), creditGranted: z.coerce.number().int().min(0).max(1_000_000).default(0)
});

export async function POST(request: Request) {
  const actor = await getApiAdmin();
  if (!actor) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const auditContext = requestAuditContext(request);
  try {
    const payment = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id: parsed.data.userId }, select: { email: true, creditBalance: true } });
      if (!target) throw new Error("USER_NOT_FOUND");
      const created = await tx.payment.create({
        data: { userId: parsed.data.userId, actorId: actor.id, amountCents: parsed.data.amountCents, currency: parsed.data.currency, status: PaymentStatus.PAID, provider: "MANUAL", externalId: parsed.data.externalId || null, description: parsed.data.description, creditGranted: parsed.data.creditGranted, paidAt: new Date() }
      });
      let balanceAfter = target.creditBalance;
      if (parsed.data.creditGranted > 0) {
        const updated = await tx.user.update({ where: { id: parsed.data.userId }, data: { creditBalance: { increment: parsed.data.creditGranted } }, select: { creditBalance: true } });
        balanceAfter = updated.creditBalance;
        await tx.creditTransaction.create({ data: { userId: parsed.data.userId, actorId: actor.id, type: CreditTransactionType.PAYMENT, amount: parsed.data.creditGranted, balanceAfter, reason: `Manuel ödeme ${created.id}`, metadata: { paymentId: created.id } } });
      }
      await tx.adminAuditLog.create({
        data: {
          actorId: actor.id, actorEmail: actor.email, action: "PAYMENT_RECORDED", targetType: "Payment", targetId: created.id,
          summary: `${target.email} için ${(parsed.data.amountCents / 100).toFixed(2)} ${parsed.data.currency} manuel ödeme kaydedildi.`,
          details: { amountCents: parsed.data.amountCents, currency: parsed.data.currency, creditGranted: parsed.data.creditGranted, balanceAfter }, ...auditContext
        }
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ ok: true, payment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    return NextResponse.json({ error: message }, { status: message === "USER_NOT_FOUND" ? 404 : 500 });
  }
}
