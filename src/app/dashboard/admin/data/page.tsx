import { AdminDataClient } from "./data-client";
import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

export default async function AdminDataPage() {
  await requireAdmin();
  const [ads, stores, users, jobs] = await Promise.all([prisma.ad.count(), prisma.store.count(), prisma.user.count(), prisma.ingestJob.findMany({ orderBy: { createdAt: "desc" }, take: 10 })]);
  return <AdminDataClient ads={ads} stores={stores} users={users} configured={Boolean(process.env.APIFY_TOKEN)} jobs={jobs.map((j) => ({ id: j.id, source: j.source === "apify" ? "Meta veri kaynağı" : j.source, type: j.type, status: j.status, recordsImported: j.recordsImported, recordsFailed: j.recordsFailed, errorMessage: j.errorMessage ? j.errorMessage.replace(/APIFY/g, "VERI_KAYNAGI") : null }))} />;
}
