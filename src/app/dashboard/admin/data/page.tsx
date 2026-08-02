import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminDataPage() {
  await requireAdmin();
  const [ads, stores, users, jobs] = await Promise.all([prisma.ad.count(), prisma.store.count(), prisma.user.count(), prisma.ingestJob.findMany({ orderBy: { createdAt: "desc" }, take: 10 })]);
  return <div><h1 className="mb-2 text-3xl font-black">Veri İşleri</h1><p className="mb-6 text-slate-500">Reklam, mağaza ve ingest operasyonları.</p><AdminNav /><div className="grid gap-4 md:grid-cols-3"><Card><b>{ads}</b><br />Ads</Card><Card><b>{stores}</b><br />Stores</Card><Card><b>{users}</b><br />Users</Card></div><Card className="mt-5"><h2 className="mb-3 font-black">Ingest Jobs</h2>{jobs.map((j) => <div key={j.id} className="border-t py-2 text-sm">{j.source} · {j.type} · {j.status} · {j.recordsImported} records</div>)}</Card></div>;
}
