"use client";

import { AdminNav } from "@/components/admin/admin-nav";
import { ManualPaymentForm, PaymentStatusForm } from "@/components/admin/admin-actions";
import { Card } from "@/components/ui/card";
import { useLang } from "@/lib/use-lang";
import { useT } from "@/lib/i18n";

type UserOption = { id: string; email: string };
type PaymentRow = {
  id: string;
  userEmail: string;
  actorEmail: string | null;
  amountLabel: string;
  provider: string;
  creditGranted: number;
  externalId: string | null;
  createdLabel: string;
  status: string;
};

export function AdminPaymentsClient({ users, payments }: { users: UserOption[]; payments: PaymentRow[] }) {
  const [lang] = useLang();
  const t = useT();
  void lang;
  return (
    <div>
      <div className="mb-6"><h1 className="text-3xl font-black">{t("adminPayments.title")}</h1><p className="mt-1 text-slate-500">{t("adminPayments.subtitle")}</p></div>
      <AdminNav />
      <Card><h2 className="mb-4 text-xl font-black">{t("adminPayments.addManual")}</h2><ManualPaymentForm users={users} /><p className="mt-3 text-xs text-amber-700">{t("adminPayments.atomicNote")}</p></Card>
      <Card className="mt-5 overflow-hidden p-0">
        <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">{t("adminPayments.user")}</th><th>{t("adminPayments.amount")}</th><th>{t("adminPayments.provider")}</th><th>{t("adminPayments.credit")}</th><th>{t("adminPayments.reference")}</th><th>{t("adminPayments.date")}</th><th>{t("adminPayments.status")}</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-t border-slate-100"><td className="p-4"><b>{payment.userEmail}</b><div className="text-xs text-slate-400">{t("adminPayments.adminLabel")}: {payment.actorEmail || t("adminPayments.system")}</div></td><td className="font-black">{payment.amountLabel}</td><td>{payment.provider}</td><td>{payment.creditGranted}</td><td>{payment.externalId || "—"}</td><td>{payment.createdLabel}</td><td><PaymentStatusForm paymentId={payment.id} status={payment.status} /></td></tr>)}</tbody></table></div>
        {!payments.length && <div className="p-5 text-sm text-slate-500">{t("adminPayments.noRecords")}</div>}
      </Card>
    </div>
  );
}
