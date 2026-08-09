import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";

function countBy(values: (string | null | undefined)[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value || "Bilinmiyor", (counts.get(value || "Bilinmiyor") || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function Bars({ rows, total }: { rows: [string, number][]; total: number }) {
  return <div className="space-y-3">{rows.slice(0, 8).map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-sm"><b>{label}</b><span className="text-slate-500">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.max(4, (value / Math.max(1, total)) * 100)}%` }} /></div></div>)}</div>;
}

export default async function TrendsPage() {
  await requireUser();
  const [ads, stores, history] = await Promise.all([
    prisma.ad.findMany({ select: { niche: true, mediaType: true, countries: true, status: true, daysRunning: true, firstSeenAt: true }, orderBy: { updatedAt: "desc" }, take: 500 }),
    prisma.store.findMany({ select: { niche: true, monthlyVisitGrowth: true, name: true, country: true }, orderBy: { monthlyVisitGrowth: "desc" }, take: 20 }),
    prisma.trendSnapshot.findMany({ orderBy: { date: "desc" }, take: 14 })
  ]);
  const active = ads.filter((ad) => ad.status === "ACTIVE");
  const longRunners = ads.filter((ad) => (ad.daysRunning || 0) >= 30);
  const newAds = ads.filter((ad) => ad.firstSeenAt && Date.now() - ad.firstSeenAt.getTime() <= 14 * 86_400_000);
  const niches = countBy(ads.map((ad) => ad.niche));
  const media = countBy(ads.map((ad) => ad.mediaType));
  const countries = countBy(ads.flatMap((ad) => ad.countries));

  return (
    <div>
      <div className="mb-6"><h1 className="text-3xl font-black">Trends</h1><p className="mt-1 text-slate-500">Reklam formatı, niche, ülke ve mağaza büyüme sinyallerini canlı veriden karşılaştır.</p></div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Card><div className="text-sm text-slate-500">İzlenen reklam</div><div className="mt-1 text-3xl font-black">{ads.length}</div></Card><Card><div className="text-sm text-slate-500">Aktif reklam</div><div className="mt-1 text-3xl font-black text-emerald-600">{active.length}</div></Card><Card><div className="text-sm text-slate-500">30+ gün yaşayan</div><div className="mt-1 text-3xl font-black">{longRunners.length}</div></Card><Card><div className="text-sm text-slate-500">Son 14 gün</div><div className="mt-1 text-3xl font-black text-violet-700">{newAds.length}</div></Card></div>
      <div className="grid gap-5 lg:grid-cols-3"><Card><h2 className="mb-4 text-lg font-black">Niche dağılımı</h2><Bars rows={niches} total={ads.length} /></Card><Card><h2 className="mb-4 text-lg font-black">Medya formatı</h2><Bars rows={media} total={ads.length} /></Card><Card><h2 className="mb-4 text-lg font-black">Ülke sinyali</h2><Bars rows={countries} total={ads.reduce((sum, ad) => sum + ad.countries.length, 0)} /></Card></div>
      <Card className="mt-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-black">Hızlı büyüyen mağazalar</h2><p className="text-sm text-slate-500">Aylık ziyaret büyümesine göre</p></div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{stores.slice(0, 8).map((store) => <div key={store.name} className="rounded-2xl border border-slate-100 p-4"><div className="font-black">{store.name}</div><div className="text-sm text-slate-500">{store.niche || "Niche yok"} · {store.country || "—"}</div><div className="mt-3 text-2xl font-black text-emerald-600">+{store.monthlyVisitGrowth || 0}%</div></div>)}</div></Card>
      <Card className="mt-5"><h2 className="text-lg font-black">14 günlük geçmiş</h2><p className="mb-4 text-sm text-slate-500">Günlük otomasyonla kaydedilen reklam ve TikTok Shop sinyalleri</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{history.map((snapshot) => { const metrics = snapshot.metrics as any; return <div key={snapshot.id} className="rounded-2xl bg-slate-50 p-3"><b>{snapshot.date.toLocaleDateString("tr-TR")}</b><p className="mt-1 text-sm text-slate-600">{metrics.ads?.active || 0} aktif reklam</p><p className="text-sm text-slate-600">{metrics.tiktok?.total || 0} TikTok ürün</p></div>; })}{!history.length && <p className="text-sm text-slate-500">İlk günlük snapshot henüz oluşmadı.</p>}</div></Card>
    </div>
  );
}
