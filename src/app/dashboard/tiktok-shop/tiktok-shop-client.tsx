"use client";
import { Card } from "@/components/ui/card";
import { TikTokShopImport } from "@/components/tiktok-shop-import";
import { useT } from "@/lib/i18n";

export function TikTokShopClient({ planLimit, q, region, ranked, regions }: {
  planLimit: number;
  q: string | undefined;
  region: string | undefined;
  ranked: any[];
  regions: string[];
}) {
  const t = useT();
  return <div>
    <div className="mb-6"><h1 className="text-3xl font-black">{t("tiktok.title")}</h1><p className="mt-1 text-slate-500">{t("tiktok.description")}</p></div>
    <TikTokShopImport planLimit={planLimit} />
    <form className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-soft md:grid-cols-[1fr_180px_120px]">
      <input name="q" defaultValue={q} placeholder={t("tiktok.searchPlaceholder")} className="rounded-2xl border border-slate-200 px-4 py-3" />
      <select name="region" defaultValue={region || ""} className="rounded-2xl border border-slate-200 px-4 py-3"><option value="">{t("tiktok.allRegions")}</option>{regions.map((item) => <option key={item}>{item}</option>)}</select>
      <button className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">{t("tiktok.filter")}</button>
    </form>
    <div className="mb-5 grid gap-4 sm:grid-cols-3">
      <Card><div className="text-sm text-slate-500">{t("tiktok.liveProducts")}</div><div className="mt-1 text-3xl font-black">{ranked.length}</div></Card>
      <Card><div className="text-sm text-slate-500">{t("tiktok.stores")}</div><div className="mt-1 text-3xl font-black">{new Set(ranked.map((item) => item.shopExternalId || item.shopName)).size}</div></Card>
      <Card><div className="text-sm text-slate-500">{t("tiktok.totalSalesSignal")}</div><div className="mt-1 text-3xl font-black">{ranked.reduce((sum, item) => sum + (item.soldCount || 0), 0).toLocaleString("tr-TR")}</div></Card>
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ranked.map((product) => <Card key={product.id}>
      {product.imageUrl ? <img src={product.imageUrl} alt="" className="mb-4 h-44 w-full rounded-2xl object-cover" /> : <div className="mb-4 grid h-44 place-items-center rounded-2xl bg-slate-100 text-slate-400">{t("tiktok.noProductImage")}</div>}
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-black">{product.title}</h2><p className="text-sm text-slate-500">{product.shopName || t("tiktok.storeUnknown")} · {product.region}</p></div><span className="rounded-full bg-fuchsia-50 px-3 py-1 text-sm font-black text-fuchsia-700">{product.score}</span></div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-slate-50 p-2"><b>{product.price ? `${product.price} ${product.currency || ""}` : "—"}</b><br />{t("tiktok.price")}</div>
        <div className="rounded-xl bg-slate-50 p-2"><b>{(product.soldCount || 0).toLocaleString("tr-TR")}</b><br />{t("tiktok.sales")}</div>
        <div className="rounded-xl bg-slate-50 p-2"><b>{product.rating || "—"}</b><br />{t("tiktok.score")}</div>
      </div>
      {product.productUrl && <a href={product.productUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-bold text-violet-700">{t("tiktok.openOnTiktok")}</a>}
    </Card>)}{!ranked.length && <Card className="text-center text-slate-500 md:col-span-2 xl:col-span-3">{t("tiktok.searchFirst")}</Card>}</div>
  </div>;
}