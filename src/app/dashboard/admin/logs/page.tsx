import { AdminLogsClient } from "./logs-client";
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
    <AdminLogsClient
      audits={audits.map((log) => ({ id: log.id, action: log.action.replace(/APIFY/g, "META_DATA"), summary: log.summary.replace(/Apify/gi, "veri kaynağı"), actorEmail: log.actorEmail, ipLabel: log.ipAddress || "IP yok", createdLabel: log.createdAt.toLocaleString("tr-TR") }))}
      credits={credits.map((tx) => ({ id: tx.id, email: tx.user.email, type: tx.type, amount: tx.amount, balanceAfter: tx.balanceAfter, reason: tx.reason, createdLabel: tx.createdAt.toLocaleString("tr-TR") }))}
      ingestJobs={ingestJobs.map((job) => ({ id: job.id, source: job.source === "apify" ? "Meta veri kaynağı" : job.source, type: job.type, status: job.status, recordsImported: job.recordsImported, recordsFailed: job.recordsFailed, errorMessage: job.errorMessage ? job.errorMessage.replace(/APIFY/g, "VERI_KAYNAGI") : null }))}
      exportJobs={exportJobs.map((job) => ({ id: job.id, email: job.user.email, module: job.module, status: job.status, createdLabel: job.createdAt.toLocaleString("tr-TR"), errorMessage: job.errorMessage }))}
      sessions={sessions.map((session) => ({ id: session.id, email: session.user.email, createdLabel: session.createdAt.toLocaleString("tr-TR"), expiresLabel: session.expiresAt.toLocaleString("tr-TR") }))}
    />
  );
}
