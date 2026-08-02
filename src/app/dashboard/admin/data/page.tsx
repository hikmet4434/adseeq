import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { AdminNav } from "@/components/admin/admin-nav";
import { ApifyIngestForm } from "@/components/admin/apify-ingest-form";

export default async function AdminDataPage() {
  await requireAdmin();
  const [ads, stores, users, jobs] = await Promise.all([prisma.ad.count(), prisma.store.count(), prisma.user.count(), prisma.ingestJob.findMany({ orderBy: { createdAt: "desc" }, take: 10 })]);
  return <div><h1 className="mb-2 text-3xl font-black">Veri İşleri</h1><p className="mb-6 text-slate-500">Reklam, mağaza ve ingest operasyonları.</p><AdminNav /><div className="grid gap-4 md:grid-cols-3"><Card><b className="text-3xl">{ads}</b><br />Ads</Card><Card><b className="text-3xl">{stores}</b><br />Stores</Card><Card><b className="text-3xl">{users}</b><br />Users</Card></div><Card className="mt-5"><div className="mb-4"><h2 className="text-xl font-black">Apify · Meta Ads Library</h2><p className="mt-1 text-sm text-slate-500">Anahtar kelimeyle gerçek Meta reklamlarını çekin. Her çalışmada maliyet üst sınırı uygulanır ve tekrar eden reklamlar güncellenir.</p></div><ApifyIngestForm configured={Boolean(process.env.APIFY_TOKEN)} /></Card><Card className="mt-5"><h2 className="mb-3 font-black">Ingest Jobs</h2>{jobs.map((j) => <div key={j.id} className="border-t py-3 text-sm"><b>{j.source} · {j.type}</b><div className="text-slate-500">{j.status} · {j.recordsImported} başarılı · {j.recordsFailed} hatalı</div>{j.errorMessage && <div className="text-rose-600">{j.errorMessage}</div>}</div>)}{!jobs.length && <p className="text-sm text-slate-500">Henüz ingest işi yok.</p>}</Card></div>;
}
