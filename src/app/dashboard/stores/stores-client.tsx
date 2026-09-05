"use client";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { useT } from "@/lib/i18n";

export function StoresClient({ q, niche, stores }: {
  q: string | undefined;
  niche: string | undefined;
  stores: any[];
}) {
  const t = useT();
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black">{t("stores.title")}</h1>
        <p className="mt-1 text-slate-500">{t("stores.description")}</p>
      </div>
      <form className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-soft md:grid-cols-[1fr_220px_120px]">
        <input name="q" defaultValue={q} placeholder={t("stores.searchPlaceholder")} className="rounded-2xl border border-slate-200 px-4 py-3" />
        <select name="niche" defaultValue={niche || ""} className="rounded-2xl border border-slate-200 px-4 py-3">
          <option value="">{t("stores.allNiches")}</option>
          <option>Pets</option>
          <option>Beauty</option>
          <option>Supplements</option>
          <option>Household</option>
        </select>
        <button className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">{t("stores.search")}</button>
      </form>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="p-4">{t("stores.shopInfo")}</th>
                <th>{t("stores.bestSellers")}</th>
                <th>{t("stores.niche")}</th>
                <th>{t("stores.monthlyVisits")}</th>
                <th>{t("stores.estRevenue")}</th>
                <th>{t("stores.metaAds")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img src={s.logoUrl || ""} className="h-10 w-10 rounded-xl" />
                      <div>
                        <div className="font-black">{s.name}</div>
                        <div className="text-slate-500">{s.domain} · {s.country}</div>
                      </div>
                    </div>
                  </td>
                  <td>{s.products.map((p: any) => p.title).join(", ")}</td>
                  <td>{s.niche}</td>
                  <td>{s.monthlyVisits?.toLocaleString()} <span className="text-emerald-600">+{s.monthlyVisitGrowth}%</span></td>
                  <td>€{s.estRevenue30dMin?.toLocaleString()}–€{s.estRevenue30dMax?.toLocaleString()}</td>
                  <td>{s.brandPages[0]?._count.ads || 0}</td>
                  <td><Link href={`/dashboard/stores/${s.id}`} className="font-bold text-violet-700">{t("stores.details")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}