import { AdminPaymentsClient } from "./payments-client";
import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

function money(cents: number, currency: string) { return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(cents / 100); }

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const [users, payments] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true }, orderBy: { email: "asc" }, take: 500 }),
    prisma.payment.findMany({ include: { user: { select: { email: true } }, actor: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);
  return (
    <AdminPaymentsClient
      users={users}
      payments={payments.map((p) => ({
        id: p.id,
        userEmail: p.user.email,
        actorEmail: p.actor?.email || null,
        amountLabel: money(p.amountCents, p.currency),
        provider: p.provider,
        creditGranted: p.creditGranted,
        externalId: p.externalId || null,
        createdLabel: p.createdAt.toLocaleString("tr-TR"),
        status: p.status,
      }))}
    />
  );
}
