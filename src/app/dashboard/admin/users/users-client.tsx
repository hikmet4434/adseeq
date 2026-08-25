"use client";

import { Prisma, UserRole } from "@prisma/client";
import { AdminNav } from "@/components/admin/admin-nav";
import { CreditAdjustForm, PlanForm, RoleForm } from "@/components/admin/admin-actions";
import { Card } from "@/components/ui/card";
import { useLang } from "@/lib/use-lang";
import { useT } from "@/lib/i18n";

type PlanOption = { code: string };
type TxOption = { id: string; amount: number; reason: string };
type UserRow = {
  id: string;
  name: string | null;
  email: string;
  googleId: string | null;
  role: string;
  lastLoginLabel: string;
  createdLabel: string;
  planCode: string | null;
  creditBalance: number;
  creditTransactions: TxOption[];
};

export function AdminUsersClient({
  users,
  plans,
  q,
  role,
  protectedAdminEmails,
}: {
  users: UserRow[];
  plans: PlanOption[];
  q?: string;
  role?: string;
  protectedAdminEmails: Record<string, boolean>;
}) {
  const [lang] = useLang();
  const t = useT();
  void lang;
  const locale = typeof document !== "undefined" && document.documentElement.lang === "en" ? "en-US" : "tr-TR";
  return (
    <div>
      <div className="mb-6"><h1 className="text-3xl font-black">{t("adminUsers.title")}</h1><p className="mt-1 text-slate-500">{t("adminUsers.subtitle")}</p></div>
      <AdminNav />
      <form className="mb-5 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_120px]">
        <input name="q" defaultValue={q} placeholder={t("adminUsers.searchPlaceholder")} className="rounded-xl border border-slate-200 px-4 py-3" />
        <select name="role" defaultValue={role || ""} className="rounded-xl border border-slate-200 bg-white px-4 py-3"><option value="">{t("adminUsers.allRoles")}</option><option>ADMIN</option><option>USER</option></select>
        <button className="rounded-xl bg-slate-950 px-4 py-3 font-bold text-white">{t("adminUsers.filter")}</button>
      </form>
      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{user.name || user.email}</h2><span className={`rounded-full px-2 py-1 text-xs font-bold ${user.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>{user.role}</span></div><div className="text-sm text-slate-500">{user.email} · {user.googleId ? t("adminUsers.googleLinked") : t("adminUsers.emailAccount")}</div><div className="mt-1 text-xs text-slate-400">{t("adminUsers.lastLogin")}: {user.lastLoginLabel || "—"} · {t("adminUsers.registered")}: {user.createdLabel}</div></div>
              <div className="text-right"><div className="text-sm text-slate-500">{t("adminUsers.plan")}</div><div className="font-black">{user.planCode || t("adminUsers.none")}</div></div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-slate-100 p-3"><div className="text-xs font-black uppercase tracking-wide text-slate-400">{t("adminUsers.roleAndPlan")}</div><RoleForm userId={user.id} currentRole={user.role as UserRole} protectedAdmin={protectedAdminEmails[user.email] === true} /><PlanForm userId={user.id} currentPlan={user.planCode || "FREE"} plans={plans.map((plan) => plan.code)} /></div>
              <CreditAdjustForm userId={user.id} currentBalance={user.creditBalance} />
            </div>
            {!!user.creditTransactions.length && <div className="mt-3 flex flex-wrap gap-2">{user.creditTransactions.map((tx) => <span key={tx.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{tx.amount > 0 ? "+" : ""}{tx.amount} · {tx.reason}</span>)}</div>}
          </Card>
        ))}
        {!users.length && <Card><p className="text-slate-500">{t("adminUsers.noMatch")}</p></Card>}
      </div>
    </div>
  );
}
