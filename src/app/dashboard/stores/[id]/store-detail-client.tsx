"use client";

import { Card } from "@/components/ui/card";
import { AdCreativeMedia } from "@/components/ad-creative-media";
import { useLang } from "@/lib/use-lang";
import { useT } from "@/lib/i18n";

export type CreativeLite = Parameters<typeof AdCreativeMedia>[0]["creative"];
export type AdLite = { id: string; headline: string | null; rankPercentile: number | null; daysRunning: number | null; creative: CreativeLite };
export type ProductLite = { id: string; title: string; currency: string | null; price: number | null };
export type PixelLite = { id: string; type: string };
export type AppLite = { id: string; name: string };
export type SimilarLite = { id: string; name: string; visitsLabel: string };

export function StoreDetailClient({
  store,
  adsCount,
  ads,
  products,
  pixels,
  apps,
  similar,
}: {
  store: { name: string; domain: string | null; country: string | null; niche: string | null; logoUrl: string | null; shopUrl: string | null; monthlyVisitsLabel: string; revenueMinLabel: string; revenueMaxLabel: string; productCount: number };
  adsCount: number;
  ads: AdLite[];
  products: ProductLite[];
  pixels: PixelLite[];
  apps: AppLite[];
  similar: SimilarLite[];
}) {
  const [lang] = useLang();
  const t = useT();
  void lang;
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
        <a href={store.shopUrl || "#"} className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">{t("storeDetail.visitShop")}</a>
      </div>
      <div className="mb-5 grid gap-4 md:grid-cols-4">
        <Card><div className="text-sm text-slate-500">{t("storeDetail.monthlyVisits")}</div><div className="mt-1 text-2xl font-black">{store.monthlyVisitsLabel}</div></Card>
        <Card><div className="text-sm text-slate-500">{t("storeDetail.estRevenue")}</div><div className="mt-1 text-2xl font-black">€{store.revenueMinLabel}–€{store.revenueMaxLabel}</div></Card>
        <Card><div className="text-sm text-slate-500">{t("storeDetail.products")}</div><div className="mt-1 text-2xl font-black">{store.productCount}</div></Card>
        <Card><div className="text-sm text-slate-500">{t("storeDetail.activeAds")}</div><div className="mt-1 text-2xl font-black">{adsCount}</div></Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-xl font-black">{t("storeDetail.bestSelling")}</h2>
          <div className="space-y-3">
            {products.map((p) => <div key={p.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"><div className="font-bold">{p.title}</div><div>{p.currency} {p.price}</div></div>)}
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-xl font-black">{t("storeDetail.pixelsStack")}</h2>
          <div className="mb-4 flex flex-wrap gap-2">{pixels.map((p) => <span key={p.id} className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-700">{p.type}</span>)}</div>
          <div className="flex flex-wrap gap-2">{apps.map((a) => <span key={a.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">{a.name}</span>)}</div>
        </Card>
      </div>
      <Card className="mt-5">
        <h2 className="mb-4 text-xl font-black">{t("storeDetail.topMetaAds")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {ads.map((ad) => <div key={ad.id} className="rounded-2xl border border-slate-100 p-3"><AdCreativeMedia creative={ad.creative} className="mb-3 h-32 w-full rounded-xl object-cover" /><div className="font-black">{ad.headline}</div><div className="text-sm text-slate-500">{t("storeDetail.topPercent", { percentile: ad.rankPercentile ?? 0 })} · {t("storeDetail.daysRunning", { days: ad.daysRunning ?? 0 })}</div></div>)}
        </div>
      </Card>
      <Card className="mt-5">
        <h2 className="mb-4 text-xl font-black">{t("storeDetail.similarStores")}</h2>
        <div className="grid gap-3 md:grid-cols-4">{similar.map((s) => <a key={s.id} href={`/dashboard/stores/${s.id}`} className="rounded-2xl bg-slate-50 p-4"><div className="font-black">{s.name}</div><div className="text-sm text-slate-500">{s.visitsLabel} {t("storeDetail.visits")}</div></a>)}</div>
      </Card>
    </div>
  );
}
