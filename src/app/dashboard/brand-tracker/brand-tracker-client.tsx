"use client";
import { Card } from "@/components/ui/card";
import { BrandTrackerActions } from "@/components/brand-tracker-actions";
import { useT } from "@/lib/i18n";

export function BrandTrackerClient({ query, brands, tracked, alerts, trackedByBrand, limit }: {
  query: string | undefined;
  brands: any[];
  tracked: any[];
  alerts: any[];
  trackedByBrand: Map<any, any>;
  limit: number | null;
}) {
  const t = useT();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-black">{t("brand.title")}</h1><p className="mt-1 text-slate-500">{t("brand.description")}</p></div>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm"><b>{tracked.length}</b> {t("brand.trackingLabel")} · {t("brand.limitLabel")}: <b>{limit === null ? t("brand.unlimited") : limit}</b></div>
      </div>
      <form className="mb-5 flex gap-3 rounded-3xl bg-white p-4 shadow-soft">
        <input name="q" defaultValue={query} placeholder={t("brand.searchPlaceholder")} className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3" />
        <button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">{t("brand.search")}</button>
      </form>
      {alerts.length > 0 && <Card className="mb-5"><h2 className="text-lg font-black">{t("brand.newAlerts")}</h2><div className="mt-3 space-y-2">{alerts.map((alert) => <div key={alert.id} className="flex items-center justify-between gap-3 rounded-2xl bg-violet-50 p-3 text-sm"><div><b>{alert.trackedBrand.brandPage.name}</b><p className="text-slate-600">{alert.title}</p></div><span className="shrink-0 text-xs text-slate-400">{alert.createdAt.toLocaleDateString("tr-TR")}</span></div>)}</div></Card>}
      <div className="grid gap-4 lg:grid-cols-2">
        {brands.map((brand) => {
          const activeAds = brand.ads.filter((ad: any) => ad.status === "ACTIVE").length;
          return <Card key={brand.id} className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 font-black text-violet-700">{brand.name.slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0"><h2 className="truncate text-lg font-black">{brand.name}</h2><p className="truncate text-sm text-slate-500">{brand.websiteDomain || brand.pageUrl || t("brand.metaPage")}</p></div>
              </div>
              <BrandTrackerActions brandPageId={brand.id} trackingId={trackedByBrand.get(brand.id)} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-2xl bg-slate-50 p-3"><b>{brand._count.ads}</b><br /><span className="text-xs text-slate-500">{t("brand.totalAds")}</span></div>
              <div className="rounded-2xl bg-emerald-50 p-3"><b>{activeAds}</b><br /><span className="text-xs text-slate-500">{t("brand.recentActive")}</span></div>
              <div className="rounded-2xl bg-slate-50 p-3"><b>{brand.niche || "—"}</b><br /><span className="text-xs text-slate-500">{t("brand.niche")}</span></div>
            </div>
            <div className="space-y-2">
              {brand.ads.map((ad: any) => <div key={ad.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 text-sm"><span className="truncate font-semibold">{ad.headline || t("brand.headlessCreative")}</span><span className="shrink-0 text-xs text-slate-500">{ad.mediaType} · {ad.daysRunning || "—"} {t("brand.days")}</span></div>)}
              {!brand.ads.length && <p className="text-sm text-slate-500">{t("brand.noAdsYet")}</p>}
            </div>
          </Card>;
        })}
        {!brands.length && <Card className="text-center text-slate-500 lg:col-span-2">{t("brand.noResults")}</Card>}
      </div>
    </div>
  );
}