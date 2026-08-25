import Link from "next/link";
import { PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminClient } from "./admin-client";
import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

function money(cents: number | null | undefined, currency = "EUR") {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format((cents || 0) / 100);
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [users, admins, activeSubscriptions, paid, totalCredits, recentPayments, recentAudits] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.subscription.count({ where: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] } } }),
    prisma.payment.aggregate({ where: { status: PaymentStatus.PAID, createdAt: { gte: since } }, _sum: { amountCents: true }, _count: true }),
    prisma.user.aggregate({ _sum: { creditBalance: true } }),
    prisma.payment.findMany({ include: { user: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 })
  ]);

  return <AdminClient users={users} admins={admins} activeSubscriptions={activeSubscriptions} paid={paid} totalCredits={totalCredits} recentPayments={recentPayments} recentAudits={recentAudits} money={money} />;
}
