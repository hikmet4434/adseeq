import { AdminNav } from "@/components/admin/admin-nav";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

export default async function AdminLogsPage() {
  await requireAdmin();
  const [audits, credits, ingestJobs, exportJobs, sessions] = await Promise.all([
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.creditTransaction.findMany({ include: { user: { select: { email: true } }, actor: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.ingestJob.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.exportJob.findMany({ include: { user: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.authSession.findMany({ include: { user: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 50 })
  ]);
  return (
    <div>
      <div className="mb-6"><h1 className="text-3xl font-black">Log Merkezi</h1><p className="mt-1 text-slate-500">Admin audit, kredi hareketleri, veri işleri ve oturum kayıtları.</p></div>
      <AdminNav />
      <div className="space-y-5">
        <Card><h2 className="mb-4 text-xl font-black">Admin audit logları</h2><div className="space-y-2">{audits.map((log) => <div key={log.id} className="rounded-2xl bg-slate-50 p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><b>{log.action}</b><span className="text-xs text-slate-400">{log.createdAt.toLocaleString("tr-TR")}</span></div><p className="mt-1">{log.summary}</p><div className="mt-1 text-xs text-slate-500">{log.actorEmail} · {log.ipAddress || "IP yok"}</div></div>)}{!audits.length && <p className="text-sm text-slate-500">Audit kaydı yok.</p>}</div></Card>
        <Card><h2 className="mb-4 text-xl font-black">Kredi hareketleri</h2><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th>Kullanıcı</th><th>Tür</th><th>Miktar</th><th>Bakiye</th><th>Neden</th><th>Tarih</th></tr></thead><tbody>{credits.map((tx) => <tr key={tx.id} className="border-t border-slate-100"><td className="py-3">{tx.user.email}</td><td>{tx.type}</td><td className={tx.amount >= 0 ? "font-bold text-emerald-600" : "font-bold text-rose-600"}>{tx.amount > 0 ? "+" : ""}{tx.amount}</td><td>{tx.balanceAfter}</td><td>{tx.reason}</td><td>{tx.createdAt.toLocaleString("tr-TR")}</td></tr>)}</tbody></table></div></Card>
        <div className="grid gap-5 xl:grid-cols-2"><Card><h2 className="mb-4 text-xl font-black">Ingest işleri</h2>{ingestJobs.map((job) => <div key={job.id} className="border-t py-3 text-sm"><b>{job.source} · {job.type}</b><div className="text-slate-500">{job.status} · {job.recordsImported} başarılı · {job.recordsFailed} hatalı</div>{job.errorMessage && <div className="text-rose-600">{job.errorMessage}</div>}</div>)}</Card><Card><h2 className="mb-4 text-xl font-black">Export işleri</h2>{exportJobs.map((job) => <div key={job.id} className="border-t py-3 text-sm"><b>{job.user.email} · {job.module}</b><div className="text-slate-500">{job.status} · {job.createdAt.toLocaleString("tr-TR")}</div>{job.errorMessage && <div className="text-rose-600">{job.errorMessage}</div>}</div>)}</Card></div>
        <Card><h2 className="mb-4 text-xl font-black">Son oturumlar</h2><div className="grid gap-2 md:grid-cols-2">{sessions.map((session) => <div key={session.id} className="rounded-2xl bg-slate-50 p-3 text-sm"><b>{session.user.email}</b><div className="text-xs text-slate-500">Açılış: {session.createdAt.toLocaleString("tr-TR")} · Bitiş: {session.expiresAt.toLocaleString("tr-TR")}</div></div>)}</div></Card>
      </div>
    </div>
  );
}
