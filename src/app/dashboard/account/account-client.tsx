"use client";
import { Card } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

export function AccountClient({ user }: { user: any }) {
  const t = useT();
  return <div>
    <h1 className="mb-6 text-3xl font-black">{t("account.title")}</h1>
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <div className="text-sm text-slate-500">{t("account.account")}</div>
        <div className="mt-2 font-black">{user.email}</div>
        <div className="mt-1 text-xs text-slate-400">{t("account.role")}: {user.role}</div>
      </Card>
      <Card>
        <div className="text-sm text-slate-500">{t("account.plan")}</div>
        <div className="mt-2 text-2xl font-black">{user.subscription?.plan.name || "—"}</div>
        <div className="mt-1 text-xs text-slate-400">{user.subscription?.status || t("account.noSubscription")}</div>
      </Card>
      <Card>
        <div className="text-sm text-slate-500">{t("account.creditBalance")}</div>
        <div className="mt-2 text-3xl font-black">{user.creditBalance.toLocaleString("tr-TR")}</div>
      </Card>
    </div>
  </div>;
}