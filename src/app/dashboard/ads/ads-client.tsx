"use client";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AdCreativeMedia } from "@/components/ad-creative-media";
import { ApifyEmptySearch } from "@/components/ads/apify-empty-search";
import { AD_COUNTRIES } from "@/lib/countries";
import { useT } from "@/lib/i18n";

export function AdsClient({ plan, q, niche, mediaType, country, status, matchMode, minDays, language, sort, ads, apifyPlanLimit }: {
  plan: any;
  q: string | undefined;
  niche: string | undefined;
  mediaType: string | undefined;
  country: string | undefined;
  status: string;
  matchMode: string;
  minDays: number;
  language: string | undefined;
  sort: string;
  ads: any[];
  apifyPlanLimit: number;
}) {
  const t = useT();
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Search Meta Adlibrary</h1>
          <p className="mt-1 text-slate-500">{t("ads.description")}</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">{t("ads.planLabel")}: <b>{plan?.name}</b> · {t("ads.planWarning")}</div>
      </div>
      <form className="mb-5 rounded-3xl bg-white p-4 shadow-soft">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_220px_190px_140px]">
        <input name="q" defaultValue={q} minLength={2} placeholder={t("ads.searchPlaceholder")} className="rounded-2xl border border-slate-200 px-4 py-3" />
        <select name="country" defaultValue={country || "ALL"} aria-label={t("ads.country")} className="rounded-2xl border border-slate-200 px-4 py-3">
          {AD_COUNTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <select name="mediaType" defaultValue={mediaType || ""} className="rounded-2xl border border-slate-200 px-4 py-3">
          <option value="">{t("ads.allMedia")}</option><option>VIDEO</option><option>IMAGE</option><option>CAROUSEL</option>
        </select>
        <button className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">{t("ads.search")}</button>
        </div>
        <details className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3" open={Boolean(niche || minDays || language || status !== "ACTIVE" || matchMode !== "ALL_WORDS" || sort !== "relevance")}>
          <summary className="cursor-pointer select-none text-sm font-black text-slate-700">{t("ads.advancedSearch")}</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select name="matchMode" defaultValue={matchMode as any} aria-label={t("ads.matchMode")} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="ALL_WORDS">{t("ads.allWords")}</option><option value="EXACT_PHRASE">{t("ads.exactPhrase")}</option>
            </select>
            <select name="status" defaultValue={status as any} aria-label={t("ads.adStatus")} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="ACTIVE">{t("ads.activeAds")}</option><option value="INACTIVE">{t("ads.inactiveAds")}</option><option value="ALL">{t("ads.allStatuses")}</option>
            </select>
            <select name="minDays" defaultValue={String(minDays)} aria-label={t("ads.minRunTime")} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="0">{t("ads.allDurations")}</option><option value="7">{t("ads.minDays", { days: 7 })}</option><option value="30">{t("ads.minDays", { days: 30 })}</option><option value="90">{t("ads.minDays", { days: 90 })}</option>
            </select>
            <select name="niche" defaultValue={niche || ""} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="">{t("ads.allNiches")}</option><option>Pets</option><option>Beauty</option><option>Supplements</option><option>Household</option>
            </select>
            <select name="language" defaultValue={language || ""} aria-label={t("ads.language")} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="">{t("ads.allLanguages")}</option><option value="tr">{t("ads.turkish")}</option><option value="en">{t("ads.english")}</option><option value="de">{t("ads.german")}</option><option value="fr">{t("ads.french")}</option><option value="es">{t("ads.spanish")}</option>
            </select>
            <select name="sort" defaultValue={sort} aria-label={t("ads.sortBy")} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="relevance">{t("ads.mostRelevant")}</option><option value="newest">{t("ads.newest")}</option><option value="longest">{t("ads.longestRunning")}</option>
            </select>
          </div>
        </details>
      </form>
      <div className="mb-5 flex flex-wrap gap-2">
        {["Week's biggest winners", "US winners", "Dropship Ads", "Supplements", "Top Branded"].map((x) => <span key={x} className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-800">{x}</span>)}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {q && <ApifyEmptySearch query={q} country={country || "ALL"} mediaType={mediaType || "ALL"} matchMode={matchMode as any} status={status as any} planLimit={apifyPlanLimit} existingCount={ads.length} />}
        {ads.map((ad: any) => (
          <Card key={ad.id} className="relative overflow-hidden">
            {ad.isLocked && <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-[2px]"><Link href="/pricing" className="rounded-2xl bg-violet-700 px-5 py-3 font-black text-white">{t("ads.unlockWinners")}</Link></div>}
            <div className={ad.isLocked ? "locked-blur" : ""}>
              <AdCreativeMedia creative={ad.creatives[0]} className="mb-4 h-44 w-full rounded-2xl object-cover" />
              <div className="mb-2 flex items-center justify-between">
                <div className="font-black">{ad.headline}</div>
                <div className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Top %{Math.round(ad.rankPercentile || 0)}</div>
              </div>
              <div className="text-sm font-semibold text-slate-500">{ad.brandPage?.name} · {ad.mediaType} · {ad.daysRunning} {t("ads.days")}</div>
              <p className="mt-3 line-clamp-3 text-sm text-slate-600">{ad.primaryText}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-slate-50 p-2"><b>{ad.countries.join(", ")}</b><br />{t("ads.country")}</div>
                <div className="rounded-xl bg-slate-50 p-2"><b>€{ad.estimatedSpendMin ?? "—"}</b><br />{t("ads.minSpend")}</div>
                <div className="rounded-xl bg-slate-50 p-2"><b>{ad.adScore}</b><br />{t("ads.score")}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}