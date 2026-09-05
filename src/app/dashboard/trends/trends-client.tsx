"use client";
import { Card } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

function Bars({ rows, total }: { rows: [string, number][]; total: number }) {
  return <div className="space-y-3">{rows.slice(0, 8).map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-sm"><b>{label}</b><span className="text-slate-500">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.max(4, (value / Math.max(1, total)) * 100)}%` }} /></div></div>)}</div>;
}

export function TrendsClient({ ads, active, longRunners, newAds, niches, media, countries, stores, history }: {
  ads: any[];
  active: any[];
  longRunners: any[];
  newAds: any[];
  niches: [string, number][];
  media: [string, number][];
  countries: [string, number][];
  stores: any[];
  history: any[];
}) {
  const t = useT();
  return (
    <div>
      <div className="mb-6"><h1 className="text-3xl font-black">{t("trends.title")}</h1><p className="mt-1 text-slate-500">{t("trends.description")}</p></div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><div className="text-sm text-slate-500">{t("trends.totalAds")}</div><div className="mt-1 text-3xl font-black">{ads.length}</div></Card>
        <Card><div className="text-sm text-slate-500">{t("trends.activeAds")}</div><div className="mt-1 text-3xl font-black text-emerald-600">{active.length}</div></Card>
        <Card><div className="text-sm text-slate-500">{t("trends.longRunners")}</div><div className="mt-1 text-3xl font-black">{longRunners.length}</div></Card>
        <Card><div className="text-sm text-slate-500">{t("trends.newAds")}</div><div className="mt-1 text-3xl font-black text-violet-700">{newAds.length}</div></Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card><h2 className="mb-4 text-lg font-black">{t("trends.nicheDistribution")}</h2><Bars rows={niches} total={ads.length} /></Card>
        <Card><h2 className="mb-4 text-lg font-black">{t("trends.mediaFormat")}</h2><Bars rows={media} total={ads.length} /></Card>
        <Card><h2 className="mb-4 text-lg font-black">{t("trends.countrySignal")}</h2><Bars rows={countries} total={ads.reduce((sum, ad) => sum + ad.countries.length, 0)} /></Card>
      </div>
      <Card className="mt-5">
        <div className="mb-4 flex items-center justify-between">
          <div><h2 className="text-lg font-black">{t("trends.fastGrowingStores")}</h2><p className="text-sm text-slate-500">{t("trends.byMonthlyGrowth")}</p></div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {stores.slice(0, 8).map((store) => (
            <div key={store.name} className="rounded-2xl border border-slate-100 p-4">
              <div className="font-black">{store.name}</div>
              <div className="text-sm text-slate-500">{store.niche || t("trends.noNiche")} · {store.country || "—"}</div>
              <div className="mt-3 text-2xl font-black text-emerald-600">+{store.monthlyVisitGrowth || 0}%</div>
            </div>
          ))}
        </div>
      </Card>
      <Card className="mt-5">
        <h2 className="text-lg font-black">{t("trends.historyTitle")}</h2>
        <p className="mb-4 text-sm text-slate-500">{t("trends.historyDescription")}</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {history.map((snapshot) => {
            const metrics = snapshot.metrics as any;
            return (
              <div key={snapshot.id} className="rounded-2xl bg-slate-50 p-3">
                <b>{snapshot.date.toLocaleDateString("tr-TR")}</b>
                <p className="mt-1 text-sm text-slate-600">{metrics.ads?.active || 0} {t("trends.activeAds")}</p>
                <p className="text-sm text-slate-600">{metrics.tiktok?.total || 0} {t("trends.tiktokProducts")}</p>
              </div>
            );
          })}
          {!history.length && <p className="text-sm text-slate-500">{t("trends.noSnapshotYet")}</p>}
        </div>
      </Card>
    </div>
  );
}