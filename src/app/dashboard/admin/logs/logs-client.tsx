"use client";

import { AdminNav } from "@/components/admin/admin-nav";
import { Card } from "@/components/ui/card";
import { useLang } from "@/lib/use-lang";
import { useT } from "@/lib/i18n";

export type AuditRow = { id: string; action: string; summary: string; actorEmail: string; ipLabel: string; createdLabel: string };
export type CreditRow = { id: string; email: string; type: string; amount: number; balanceAfter: number; reason: string; createdLabel: string };
export type IngestRow = { id: string; source: string; type: string; status: string; recordsImported: number; recordsFailed: number; errorMessage: string | null };
export type ExportRow = { id: string; email: string; module: string; status: string; createdLabel: string; errorMessage: string | null };
export type SessionRow = { id: string; email: string; createdLabel: string; expiresLabel: string };

export function AdminLogsClient({ audits, credits, ingestJobs, exportJobs, sessions }: { audits: AuditRow[]; credits: CreditRow[]; ingestJobs: IngestRow[]; exportJobs: ExportRow[]; sessions: SessionRow[] }) {
  const [lang] = useLang();
  const t = useT();
  void lang;
  return (
    <div>
      <div className="mb-6"><h1 className="text-3xl font-black">{t("adminLogs.title")}</h1><p className="mt-1 text-slate-500">{t("adminLogs.subtitle")}</p></div>
      <AdminNav />
      <div className="space-y-5">
        <Card><h2 className="mb-4 text-xl font-black">{t("adminLogs.auditTitle")}</h2><div className="space-y-2">{audits.map((log) => <div key={log.id} className="rounded-2xl bg-slate-50 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><b>{log.action}</b><span className="text-xs text-slate-400">{log.createdLabel}</span></div><p className="mt-1">{log.summary}</p><div className="mt-1 text-xs text-slate-500">{log.actorEmail} · {log.ipLabel}</div></div>)}{!audits.length && <p className="text-sm text-slate-500">{t("adminLogs.noAudit")}</p>}</div></Card>
        <Card><h2 className="mb-4 text-xl font-black">{t("adminLogs.creditsTitle")}</h2><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th>{t("adminLogs.user")}</th><th>{t("adminLogs.type")}</th><th>{t("adminLogs.amount")}</th><th>{t("adminLogs.balance")}</th><th>{t("adminLogs.reason")}</th><th>{t("adminLogs.date")}</th></tr></thead><tbody>{credits.map((tx) => <tr key={tx.id} className="border-t border-slate-100"><td className="py-3">{tx.email}</td><td>{tx.type}</td><td className={tx.amount >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>{tx.amount > 0 ? "+" : ""}{tx.amount}</td><td>{tx.balanceAfter}</td><td>{tx.reason}</td><td>{tx.createdLabel}</td></tr>)}</tbody></table></div></Card>
        <div className="grid gap-5 xl:grid-cols-2"><Card><h2 className="mb-4 text-xl font-black">{t("adminLogs.ingestTitle")}</h2>{ingestJobs.map((job) => <div key={job.id} className="border-t py-3 text-sm"><b>{job.source} · {job.type}</b><div className="text-slate-500">{job.status} · {job.recordsImported} {t("adminLogs.ok")} · {job.recordsFailed} {t("adminLogs.failed")}</div>{job.errorMessage && <div className="text-rose-600">{job.errorMessage}</div>}</div>)}</Card><Card><h2 className="mb-4 text-xl font-black">{t("adminLogs.exportTitle")}</h2>{exportJobs.map((job) => <div key={job.id} className="border-t py-3 text-sm"><b>{job.email} · {job.module}</b><div className="text-slate-500">{job.status} · {job.createdLabel}</div>{job.errorMessage && <div className="text-rose-600">{job.errorMessage}</div>}</div>)}</Card></div>
        <Card><h2 className="mb-4 text-xl font-black">{t("adminLogs.sessionsTitle")}</h2><div className="grid gap-2 md:grid-cols-2">{sessions.map((session) => <div key={session.id} className="rounded-2xl bg-slate-50 p-3 text-sm"><b>{session.email}</b><div className="text-xs text-slate-500">{t("adminLogs.opened")}: {session.createdLabel} · {t("adminLogs.expires")}: {session.expiresLabel}</div></div>)}</div></Card>
      </div>
    </div>
  );
}
