"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((data as { error?: string }).error || "FAIL");
  return data;
}

function Feedback({ message, error }: { message: string; error: boolean }) {
  if (!message) return null;
  return <p className={`mt-2 text-xs font-semibold ${error ? "text-rose-600" : "text-emerald-600"}`}>{message}</p>;
}

export function CreditAdjustForm({ userId, currentBalance }: { userId: string; currentBalance: number }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const operation = String(form.get("operation"));
    const amount = Number(form.get("amount"));
    if (operation === "remove" && !window.confirm(t("credit.confirmRemove", { amount }))) return;
    setBusy(true); setMessage("");
    try {
      const result = await postJson(`/api/admin/users/${userId}/credits`, { operation, amount, reason: form.get("reason") });
      setIsError(false); setMessage(t("credit.newBalance", { balance: (result as { balance: number }).balance })); formElement.reset(); router.refresh();
    } catch (error) { setIsError(true); setMessage(error instanceof Error && error.message !== "FAIL" ? error.message : t("common.operationFailed")); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-slate-50 p-3">
      <div className="mb-2 text-xs font-bold text-slate-500">{t("credit.balance")}: {currentBalance.toLocaleString("tr-TR")}</div>
      <div className="grid gap-2 sm:grid-cols-[110px_100px_1fr_auto]">
        <select name="operation" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="add">{t("credit.add")}</option><option value="remove">{t("credit.remove")}</option></select>
        <input name="amount" type="number" min="1" max="1000000" required placeholder={t("credit.amount")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <input name="reason" minLength={3} maxLength={240} required placeholder={t("credit.reason")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <button disabled={busy} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "..." : t("common.apply")}</button>
      </div>
      <Feedback message={message} error={isError} />
    </form>
  );
}

export function RoleForm({ userId, currentRole, protectedAdmin }: { userId: string; currentRole: "USER" | "ADMIN"; protectedAdmin: boolean }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const role = String(form.get("role"));
    if (role === "USER" && !window.confirm(t("role.confirmDemote"))) return;
    setBusy(true); setMessage("");
    try { await postJson(`/api/admin/users/${userId}/role`, { role }); setIsError(false); setMessage(t("role.updated")); router.refresh(); }
    catch (error) { setIsError(true); setMessage(error instanceof Error && error.message !== "FAIL" ? error.message : t("common.operationFailed")); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <select name="role" defaultValue={currentRole} disabled={protectedAdmin} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select>
      <button disabled={busy || protectedAdmin} className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">{t("role.assign")}</button>
      {protectedAdmin && <span className="text-xs font-semibold text-amber-700">{t("role.protected")}</span>}
      <Feedback message={message} error={isError} />
    </form>
  );
}

export function PlanForm({ userId, currentPlan, plans }: { userId: string; currentPlan: string; plans: string[] }) {
  const router = useRouter(); const t = useT(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [isError, setIsError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setBusy(true); setMessage("");
    try { await postJson(`/api/admin/users/${userId}/plan`, { planCode: form.get("planCode"), status: form.get("status") }); setIsError(false); setMessage(t("plan.updated")); router.refresh(); }
    catch (error) { setIsError(true); setMessage(error instanceof Error && error.message !== "FAIL" ? error.message : t("common.operationFailed")); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <select name="planCode" defaultValue={currentPlan} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">{plans.map((plan) => <option key={plan}>{plan}</option>)}</select>
      <select name="status" defaultValue="ACTIVE" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option>ACTIVE</option><option>TRIALING</option><option>PAST_DUE</option><option>CANCELED</option><option>EXPIRED</option></select>
      <button disabled={busy} className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">{t("plan.save")}</button>
      <Feedback message={message} error={isError} />
    </form>
  );
}

export function ManualPaymentForm({ users }: { users: Array<{ id: string; email: string }> }) {
  const router = useRouter(); const t = useT(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [isError, setIsError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setBusy(true); setMessage("");
    try {
      await postJson("/api/admin/payments", { userId: form.get("userId"), amountCents: Math.round(Number(form.get("amount")) * 100), currency: form.get("currency"), creditGranted: Number(form.get("creditGranted") || 0), description: form.get("description"), externalId: form.get("externalId") || null });
      setIsError(false); setMessage(t("payment.saved")); formElement.reset(); router.refresh();
    } catch (error) { setIsError(true); setMessage(error instanceof Error && error.message !== "FAIL" ? error.message : t("common.operationFailed")); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
      <select name="userId" required className="rounded-xl border border-slate-200 bg-white px-3 py-3"><option value="">{t("payment.selectUser")}</option>{users.map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select>
      <div className="grid grid-cols-[1fr_90px] gap-2"><input name="amount" type="number" min="0.01" step="0.01" required placeholder={t("payment.amount")} className="rounded-xl border border-slate-200 px-3 py-3" /><select name="currency" defaultValue="EUR" className="rounded-xl border border-slate-200 bg-white px-2"><option>EUR</option><option>USD</option><option>TRY</option></select></div>
      <input name="creditGranted" type="number" min="0" max="1000000" defaultValue="0" placeholder={t("payment.credit")} className="rounded-xl border border-slate-200 px-3 py-3" />
      <input name="externalId" maxLength={120} placeholder={t("payment.reference")} className="rounded-xl border border-slate-200 px-3 py-3" />
      <input name="description" maxLength={240} defaultValue={t("payment.manualDefault")} placeholder={t("payment.description")} className="rounded-xl border border-slate-200 px-3 py-3 md:col-span-2" />
      <button disabled={busy} className="rounded-xl bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-50 md:col-span-2">{busy ? t("common.saving") : t("payment.save")}</button>
      <div className="md:col-span-2"><Feedback message={message} error={isError} /></div>
    </form>
  );
}

export function PaymentStatusForm({ paymentId, status }: { paymentId: string; status: string }) {
  const router = useRouter(); const t = useT(); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const nextStatus = String(form.get("status"));
    if ((nextStatus === "REFUNDED" || nextStatus === "CANCELED") && !window.confirm(t("payment.confirmStatus", { status: nextStatus }))) return;
    setBusy(true); try { await postJson(`/api/admin/payments/${paymentId}/status`, { status: nextStatus }); router.refresh(); } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="flex gap-2"><select name="status" defaultValue={status} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"><option>PAID</option><option>PENDING</option><option>FAILED</option><option>REFUNDED</option><option>CANCELED</option></select><button disabled={busy} className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold text-white">{t("common.save")}</button></form>;
}
