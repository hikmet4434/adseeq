import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";
import { AdCreativeMedia } from "@/components/ad-creative-media";

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  await requireUser();
  const store = await prisma.store.findUnique({
    where: { id: resolvedParams.id },
    include: { products: true, snapshots: { orderBy: { date: "asc" } }, pixels: true, apps: true, brandPages: { include: { ads: { include: { creatives: { take: 1 } }, take: 12 } } } }
  });
  if (!store) notFound();
  const similar = await prisma.store.findMany({ where: { id: { not: store.id }, niche: store.niche }, take: 8, orderBy: { monthlyVisits: "desc" } });
  const ads = store.brandPages.flatMap((p) => p.ads);
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img src={store.logoUrl || ""} className="h-16 w-16 rounded-2xl" />
          <div>
            <h1 className="text-3xl font-black">{store.name}</h1>
            <p className="text-slate-500">{store.domain} · {store.country} · {store.niche}</p>
          </div>
        </div>
        <a href={store.shopUrl || "#"} className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">Visit Shop</a>
      </div>
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Card><div className="text-sm text-slate-500">Monthly Visits</div><div className="mt-1 text-2xl font-black">{store.monthlyVisits?.toLocaleString()}</div></Card>
        <Card><div className="text-sm text-slate-500">Est Revenue</div><div className="mt-1 text-2xl font-black">€{store.estRevenue30dMin?.toLocaleString()}–€{store.estRevenue30dMax?.toLocaleString()}</div></Card>
        <Card><div className="text-sm text-slate-500">Products</div><div className="mt-1 text-2xl font-black">{store.productCount}</div></Card>
        <Card><div className="text-sm text-slate-500">Active Ads</div><div className="mt-1 text-2xl font-black">{ads.length}</div></Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-xl font-black">Best-selling Products</h2>
          <div className="space-y-3">
            {store.products.map((p) => <div key={p.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"><div className="font-bold">{p.title}</div><div>{p.currency} {p.price}</div></div>)}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-xl font-black">Pixels & Stack</h2>
          <div className="mb-4 flex flex-wrap gap-2">{store.pixels.map((p) => <span key={p.id} className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700">{p.type}</span>)}</div>
          <div className="flex flex-wrap gap-2">{store.apps.map((a) => <span key={a.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{a.name}</span>)}</div>
        </Card>
      </div>
      <Card className="mt-5">
        <h2 className="mb-4 text-xl font-black">Top Meta Ads</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {ads.map((ad) => <div key={ad.id} className="rounded-2xl border border-slate-100 p-3"><AdCreativeMedia creative={ad.creatives[0]} className="mb-3 h-32 w-full rounded-xl object-cover" /><div className="font-black">{ad.headline}</div><div className="text-sm text-slate-500">Top %{ad.rankPercentile} · {ad.daysRunning} gün</div></div>)}
        </div>
      </Card>
      <Card className="mt-5">
        <h2 className="mb-4 text-xl font-black">Similar Stores</h2>
        <div className="grid gap-3 md:grid-cols-4">{similar.map((s) => <a key={s.id} href={`/dashboard/stores/${s.id}`} className="rounded-2xl bg-slate-50 p-4"><div className="font-black">{s.name}</div><div className="text-sm text-slate-500">{s.monthlyVisits?.toLocaleString()} visits</div></a>)}</div>
      </Card>
    </div>
  );
}
