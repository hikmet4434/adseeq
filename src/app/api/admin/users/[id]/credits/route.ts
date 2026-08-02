import { CreditTransactionType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin, requestAuditContext } from "@/lib/admin-api";
import { prisma } from "@/lib/db";

const schema = z.object({
  operation: z.enum(["add", "remove"]),
  amount: z.coerce.number().int().positive().max(1_000_000),
  reason: z.string().trim().min(3).max(240)
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getApiAdmin();
  if (!actor) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const { id } = await params;
  const { operation, amount, reason } = parsed.data;
  const signedAmount = operation === "add" ? amount : -amount;
  const auditContext = requestAuditContext(request);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id }, select: { id: true, email: true, creditBalance: true } });
      if (!target) throw new Error("USER_NOT_FOUND");
      if (target.creditBalance + signedAmount < 0) throw new Error("INSUFFICIENT_CREDIT");
      const updated = await tx.user.update({ where: { id }, data: { creditBalance: { increment: signedAmount } }, select: { creditBalance: true } });
      const transaction = await tx.creditTransaction.create({
        data: {
          userId: id,
          actorId: actor.id,
          type: operation === "add" ? CreditTransactionType.ADMIN_CREDIT : CreditTransactionType.ADMIN_DEBIT,
          amount: signedAmount,
          balanceAfter: updated.creditBalance,
          reason
        }
      });
      await tx.adminAuditLog.create({
        data: {
          actorId: actor.id,
          actorEmail: actor.email,
          action: operation === "add" ? "CREDIT_ADDED" : "CREDIT_REMOVED",
          targetType: "User",
          targetId: id,
          summary: `${target.email} için ${Math.abs(signedAmount)} kredi ${operation === "add" ? "eklendi" : "çıkarıldı"}.`,
          details: { amount: signedAmount, balanceAfter: updated.creditBalance, reason },
          ...auditContext
        }
      });
      return { transaction, balance: updated.creditBalance };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "USER_NOT_FOUND" ? 404 : message === "INSUFFICIENT_CREDIT" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
