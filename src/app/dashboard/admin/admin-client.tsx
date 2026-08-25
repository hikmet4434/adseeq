"use client";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { Card } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

export function AdminClient({ users, admins, activeSubscriptions, paid, totalCredits, recentPayments, recentAudits, money }: {
  users: number;
  admins: number;
  activeSubscriptions: number;
  paid: { _sum: { amountCents: number | null }; _count: number };
  totalCredits: { _sum: { creditBalance: number | null } };
  recentPayments: any[];
  recentAudits: any[];
  money: (cents: number | null | undefined, currency?: string) => string;
}) {
  const t = useT();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-black uppercase tracking-[0.2em] text-violet-600">{t("admin.controlCenter")}</div>
          <h1 className="mt-1 text-3xl font-black">{t("admin.title")}</h1>
          <p className="mt-1 text-slate-500">{t("admin.description")}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">{t("admin.systemActive")}</div>
      </div>
      <AdminNav />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card><div className="text-sm text-slate-500">{t("admin.totalUsers")}</div><div className="mt-2 text-3xl font-black">{users}</div><div className="mt-1 text-xs text-slate-400">{admins} {t("admin.admins")}</div></Card>
        <Card><div className="text-sm text-slate-500">{t("admin.activeSubscriptions")}</div><div className="mt-2 text-3xl font-black">{activeSubscriptions}</div></Card>
        <Card><div className="text-sm text-slate-500">{t("admin.revenue30d")}</div><div className="mt-2 text-3xl font-black">{money(paid._sum.amountCents)}</div><div className="mt-1 text-xs text-slate-400">{paid._count} {t("admin.payments")}</div></Card>
        <Card><div className="text-sm text-slate-500">{t("admin.distributedCredits")}</div><div className="mt-2 text-3xl font-black">{(totalCredits._sum.creditBalance || 0).toLocaleString("tr-TR")}</div></Card>
        <Card><div className="text-sm text-slate-500">{t("admin.quickAction")}</div><Link href="/dashboard/admin/users" className="mt-3 inline-block font-black text-violet-700">{t("admin.manageUsers")}</Link></Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">{t("admin.recentPayments")}</h2>
            <Link href="/dashboard/admin/payments" className="text-sm font-bold text-violet-700">{t("admin.viewAll")}</Link>
          </div>
          <div className="space-y-3">
            {recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
                <div>
                  <div className="font-bold">{payment.user.email}</div>
                  <div className="text-xs text-slate-500">{payment.provider} · {payment.status}</div>
                </div>
                <div className="font-black">{money(payment.amountCents, payment.currency)}</div>
              </div>
            ))}
            {!recentPayments.length && <div className="text-sm text-slate-500">{t("admin.noPaymentsYet")}</div>}
          </div>
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">{t("admin.recentAdminActions")}</h2>
            <Link href="/dashboard/admin/logs" className="text-sm font-bold text-violet-700">{t("admin.logCenter")}</Link>
          </div>
          <div className="space-y-3">
            {recentAudits.map((log) => (
              <div key={log.id} className="rounded-2xl border border-slate-100 p-3">
                <div className="flex justify-between gap-3">
                  <b>{log.action}</b>
                  <span className="text-xs text-slate-400">{log.createdAt.toLocaleString("tr-TR")}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{log.summary}</p>
                <div className="mt-1 text-xs text-slate-400">{log.actorEmail}</div>
              </div>
            ))}
            {!recentAudits.length && <div className="text-sm text-slate-500">{t("admin.noAuditLogsYet")}</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}