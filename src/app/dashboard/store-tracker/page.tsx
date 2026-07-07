import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";

export default async function StoreTrackerPage() {
  const user = await requireUser();
  const tracked = await prisma.trackedStore.findMany({ where: { userId: user.id }, include: { store: { include: { products: { where: { isBestSeller: true }, take: 2 } } } }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="text-3xl font-black">Store Tracker</h1>
      <p className="mt-1 text-slate-500">Plan limitine göre rakip Shopify mağazalarını watchlist’e ekle.</p>
      <Card className="mt-5">
        <form action="/api/tracked-stores" method="post" className="mb-5 flex gap-3">
          <input name="domain" placeholder="petpro-demo.com" className="flex-1 rounded-2xl border border-slate-200 px-4 py-3" />
          <button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white" type="button">API ile ekle</button>
        </form>
        <div className="space-y-3">
          {tracked.map((t) => <a key={t.id} href={`/dashboard/stores/${t.store.id}`} className="block rounded-2xl bg-slate-50 p-4"><div className="font-black">{t.store.name}</div><div className="text-sm text-slate-500">{t.store.domain} · {t.store.products.map((p) => p.title).join(", ")} · €{t.store.estRevenue30dMax?.toLocaleString()} est.</div></a>)}
          {!tracked.length && <div className="rounded-2xl bg-amber-50 p-4 text-amber-800">Free planda tracker kapalıdır. Admin demo hesabında örnek takip bulunur.</div>}
        </div>
      </Card>
    </div>
  );
}
