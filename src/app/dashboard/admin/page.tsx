import Link from "next/link";
import { PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { AdminNav } from "@/components/admin/admin-nav";
import { Card } from "@/components/ui/card";
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><div className="text-sm font-black uppercase tracking-[0.2em] text-violet-600">Kontrol Merkezi</div><h1 className="mt-1 text-3xl font-black">WinningHunter Admin</h1><p className="mt-1 text-slate-500">Kullanıcı, gelir, kredi ve operasyon görünümü.</p></div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">Sistem aktif</div>
      </div>
      <AdminNav />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card><div className="text-sm text-slate-500">Toplam kullanıcı</div><div className="mt-2 text-3xl font-black">{users}</div><div className="mt-1 text-xs text-slate-400">{admins} admin</div></Card>
        <Card><div className="text-sm text-slate-500">Aktif abonelik</div><div className="mt-2 text-3xl font-black">{activeSubscriptions}</div></Card>
        <Card><div className="text-sm text-slate-500">30 gün gelir</div><div className="mt-2 text-3xl font-black">{money(paid._sum.amountCents)}</div><div className="mt-1 text-xs text-slate-400">{paid._count} ödeme</div></Card>
        <Card><div className="text-sm text-slate-500">Dağıtılan kredi</div><div className="mt-2 text-3xl font-black">{(totalCredits._sum.creditBalance || 0).toLocaleString("tr-TR")}</div></Card>
        <Card><div className="text-sm text-slate-500">Hızlı işlem</div><Link href="/dashboard/admin/users" className="mt-3 inline-block font-black text-violet-700">Kullanıcı yönet →</Link></Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">Son ödemeler</h2><Link href="/dashboard/admin/payments" className="text-sm font-bold text-violet-700">Tümü</Link></div>
          <div className="space-y-3">{recentPayments.map((payment) => <div key={payment.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"><div><div className="font-bold">{payment.user.email}</div><div className="text-xs text-slate-500">{payment.provider} · {payment.status}</div></div><div className="font-black">{money(payment.amountCents, payment.currency)}</div></div>)}{!recentPayments.length && <div className="text-sm text-slate-500">Henüz ödeme kaydı yok.</div>}</div>
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">Son admin işlemleri</h2><Link href="/dashboard/admin/logs" className="text-sm font-bold text-violet-700">Log merkezi</Link></div>
          <div className="space-y-3">{recentAudits.map((log) => <div key={log.id} className="rounded-2xl border border-slate-100 p-3"><div className="flex justify-between gap-3"><b>{log.action}</b><span className="text-xs text-slate-400">{log.createdAt.toLocaleString("tr-TR")}</span></div><p className="mt-1 text-sm text-slate-600">{log.summary}</p><div className="mt-1 text-xs text-slate-400">{log.actorEmail}</div></div>)}{!recentAudits.length && <div className="text-sm text-slate-500">Henüz audit kaydı yok.</div>}</div>
        </Card>
      </div>
    </div>
  );
}
