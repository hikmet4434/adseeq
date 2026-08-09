import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { planFromUser, getFeatureLimit } from "@/lib/plans";
import { Card } from "@/components/ui/card";
import { BrandTrackerActions } from "@/components/brand-tracker-actions";

export default async function BrandTrackerPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const query = (await searchParams).q?.trim();
  const where: Prisma.BrandPageWhereInput = query ? {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { websiteDomain: { contains: query, mode: "insensitive" } },
      { niche: { contains: query, mode: "insensitive" } }
    ]
  } : {};
  const [brands, tracked] = await Promise.all([
    prisma.brandPage.findMany({
      where,
      include: {
        ads: { orderBy: { firstSeenAt: "desc" }, take: 3, select: { id: true, headline: true, status: true, mediaType: true, daysRunning: true } },
        _count: { select: { ads: true } }
      },
      orderBy: { ads: { _count: "desc" } },
      take: 40
    }),
    prisma.trackedBrand.findMany({ where: { userId: user.id } })
  ]);
  const trackedByBrand = new Map(tracked.map((item) => [item.brandPageId, item.id]));
  const limit = getFeatureLimit(planFromUser(user as any), "followed_brands");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-black">Brand Tracker</h1><p className="mt-1 text-slate-500">Markaları takip et; aktif reklam sayısını ve son kreatiflerini tek ekranda izle.</p></div>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm"><b>{tracked.length}</b> takip · Limit: <b>{limit === null ? "Sınırsız" : limit}</b></div>
      </div>
      <form className="mb-5 flex gap-3 rounded-3xl bg-white p-4 shadow-soft">
        <input name="q" defaultValue={query} placeholder="Marka, domain veya niche ara" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3" />
        <button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">Ara</button>
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        {brands.map((brand) => {
          const activeAds = brand.ads.filter((ad) => ad.status === "ACTIVE").length;
          return <Card key={brand.id} className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 font-black text-violet-700">{brand.name.slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0"><h2 className="truncate text-lg font-black">{brand.name}</h2><p className="truncate text-sm text-slate-500">{brand.websiteDomain || brand.pageUrl || "Meta marka sayfası"}</p></div>
              </div>
              <BrandTrackerActions brandPageId={brand.id} trackingId={trackedByBrand.get(brand.id)} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-2xl bg-slate-50 p-3"><b>{brand._count.ads}</b><br /><span className="text-xs text-slate-500">Toplam reklam</span></div><div className="rounded-2xl bg-emerald-50 p-3"><b>{activeAds}</b><br /><span className="text-xs text-slate-500">Son 3 aktif</span></div><div className="rounded-2xl bg-slate-50 p-3"><b>{brand.niche || "—"}</b><br /><span className="text-xs text-slate-500">Niche</span></div></div>
            <div className="space-y-2">{brand.ads.map((ad) => <div key={ad.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-sm"><span className="truncate font-semibold">{ad.headline || "Başlıksız kreatif"}</span><span className="shrink-0 text-xs text-slate-500">{ad.mediaType} · {ad.daysRunning || "—"} gün</span></div>)}{!brand.ads.length && <p className="text-sm text-slate-500">Henüz reklam verisi yok.</p>}</div>
          </Card>;
        })}
        {!brands.length && <Card className="text-center text-slate-500 lg:col-span-2">Aramanızla eşleşen marka bulunamadı.</Card>}
      </div>
    </div>
  );
}
