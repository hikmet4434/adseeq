import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { maskAdForPlan } from "@/lib/locked-response";
import { planFromUser } from "@/lib/plans";
import { Card } from "@/components/ui/card";
import { AdCreativeMedia } from "@/components/ad-creative-media";
import { ApifyEmptySearch } from "@/components/ads/apify-empty-search";
import { AD_COUNTRIES } from "@/lib/countries";
import { AdSearchMatchMode, adSearchRelevance, adSearchTokens } from "@/lib/ad-search";

export default async function AdsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const plan = planFromUser(user as any);
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q?.trim();
  const niche = resolvedSearchParams.niche;
  const mediaType = resolvedSearchParams.mediaType;
  const country = resolvedSearchParams.country?.toUpperCase();
  const status = (["ACTIVE", "INACTIVE", "ALL"] as const).includes(resolvedSearchParams.status as any) ? resolvedSearchParams.status as "ACTIVE" | "INACTIVE" | "ALL" : "ACTIVE";
  const matchMode: AdSearchMatchMode = resolvedSearchParams.matchMode === "EXACT_PHRASE" ? "EXACT_PHRASE" : "ALL_WORDS";
  const minDays = Math.max(0, Math.min(3650, Number(resolvedSearchParams.minDays) || 0));
  const language = resolvedSearchParams.language?.trim();
  const sort = (["relevance", "newest", "longest"] as const).includes(resolvedSearchParams.sort as any) ? resolvedSearchParams.sort as "relevance" | "newest" | "longest" : "relevance";
  const displayableCreativeWhere: Prisma.AdCreativeWhereInput = { url: { not: "" } };
  const where: Prisma.AdWhereInput = { creatives: { some: displayableCreativeWhere } };
  if (q) {
    const terms = matchMode === "EXACT_PHRASE" ? [q] : adSearchTokens(q);
    where.AND = terms.map((term) => ({ OR: [
      { primaryText: { contains: term, mode: "insensitive" } },
      { headline: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { brandPage: { name: { contains: term, mode: "insensitive" } } }
    ] }));
  }
  if (niche) where.niche = { contains: niche, mode: "insensitive" };
  if (mediaType) where.mediaType = mediaType as any;
  if (country && country !== "ALL") where.countries = { has: country };
  if (status !== "ALL") where.status = status;
  if (minDays > 0) where.daysRunning = { gte: minDays };
  if (language) where.language = { contains: language, mode: "insensitive" };
  const realAdsExist = await prisma.ad.count({ where: { externalAdId: { not: { startsWith: "demo_ad_" } } } }) > 0;
  if (realAdsExist) where.externalAdId = { not: { startsWith: "demo_ad_" } };
  const ads = await prisma.ad.findMany({
    where,
    include: {
      brandPage: true,
      creatives: { where: displayableCreativeWhere, orderBy: { position: "asc" }, take: 1 },
      savedBy: { where: { userId: user.id } }
    },
    orderBy: sort === "longest" ? { daysRunning: "desc" } : sort === "newest" ? { firstSeenAt: "desc" } : { rankPercentile: "asc" },
    take: q ? 240 : 48
  });
  const isAdmin = user.role === "ADMIN";
  const apifyPlanLimit = isAdmin || plan?.code === "PREMIUM" ? 100 : plan?.code === "STANDARD" ? 50 : plan?.code === "BASIC" ? 25 : 0;
  const relevantAds = q
    ? ads.map((ad) => ({ ad, relevance: adSearchRelevance({ ...ad, brandName: ad.brandPage?.name }, q, matchMode) }))
      .filter((item) => item.relevance > 0)
      .sort((left, right) => sort === "relevance" ? right.relevance - left.relevance : 0)
      .slice(0, 48)
      .map((item) => item.ad)
    : ads;
  const masked = relevantAds.map((ad) => maskAdForPlan({ ...ad, isSaved: ad.savedBy.length > 0 }, plan?.code, isAdmin));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Search Meta Adlibrary</h1>
          <p className="mt-1 text-slate-500">Kazanan Meta reklamlarını anahtar kelime, ülke, niş ve medya tipine göre keşfet.</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">Plan: <b>{plan?.name}</b> · Free ise kartlar kilitli</div>
      </div>
      <form className="mb-5 rounded-3xl bg-white p-4 shadow-soft">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_220px_190px_140px]">
        <input name="q" defaultValue={q} minLength={2} placeholder="Marka, ürün veya anahtar kelime..." className="rounded-2xl border border-slate-200 px-4 py-3" />
        <select name="country" defaultValue={country || "ALL"} aria-label="Ülke" className="rounded-2xl border border-slate-200 px-4 py-3">
          {AD_COUNTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <select name="mediaType" defaultValue={mediaType || ""} className="rounded-2xl border border-slate-200 px-4 py-3">
          <option value="">Tüm medya</option><option>VIDEO</option><option>IMAGE</option><option>CAROUSEL</option>
        </select>
        <button className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">Ara</button>
        </div>
        <details className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3" open={Boolean(niche || minDays || language || status !== "ACTIVE" || matchMode !== "ALL_WORDS" || sort !== "relevance")}>
          <summary className="cursor-pointer select-none text-sm font-black text-slate-700">Detaylı arama</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select name="matchMode" defaultValue={matchMode} aria-label="Kelime eşleşmesi" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="ALL_WORDS">Tüm kelimeler</option><option value="EXACT_PHRASE">Tam ifade</option>
            </select>
            <select name="status" defaultValue={status} aria-label="Reklam durumu" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="ACTIVE">Aktif reklamlar</option><option value="INACTIVE">Pasif reklamlar</option><option value="ALL">Tüm durumlar</option>
            </select>
            <select name="minDays" defaultValue={String(minDays)} aria-label="Minimum yayın süresi" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="0">Tüm süreler</option><option value="7">En az 7 gün</option><option value="30">En az 30 gün</option><option value="90">En az 90 gün</option>
            </select>
            <select name="niche" defaultValue={niche || ""} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="">Tüm nişler</option><option>Pets</option><option>Beauty</option><option>Supplements</option><option>Household</option>
            </select>
            <select name="language" defaultValue={language || ""} aria-label="Dil" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="">Tüm diller</option><option value="tr">Türkçe</option><option value="en">İngilizce</option><option value="de">Almanca</option><option value="fr">Fransızca</option><option value="es">İspanyolca</option>
            </select>
            <select name="sort" defaultValue={sort} aria-label="Sıralama" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
              <option value="relevance">En ilgili</option><option value="newest">En yeni</option><option value="longest">En uzun süren</option>
            </select>
          </div>
        </details>
      </form>
      <div className="mb-5 flex flex-wrap gap-2">
        {["Week's biggest winners", "US winners", "Dropship Ads", "Supplements", "Top Branded"].map((x) => <span key={x} className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-800">{x}</span>)}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {q && masked.length === 0 && <ApifyEmptySearch query={q} country={country || "ALL"} mediaType={mediaType || "ALL"} matchMode={matchMode} status={status} planLimit={apifyPlanLimit} />}
        {masked.map((ad: any) => (
          <Card key={ad.id} className="relative overflow-hidden">
            {ad.isLocked && <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-[2px]"><Link href="/pricing" className="rounded-2xl bg-violet-700 px-5 py-3 font-black text-white">Start now — Unlock winners</Link></div>}
            <div className={ad.isLocked ? "locked-blur" : ""}>
              <AdCreativeMedia creative={ad.creatives[0]} className="mb-4 h-44 w-full rounded-2xl object-cover" />
              <div className="mb-2 flex items-center justify-between">
                <div className="font-black">{ad.headline}</div>
                <div className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Top %{Math.round(ad.rankPercentile || 0)}</div>
              </div>
              <div className="text-sm font-semibold text-slate-500">{ad.brandPage?.name} · {ad.mediaType} · {ad.daysRunning} gün</div>
              <p className="mt-3 line-clamp-3 text-sm text-slate-600">{ad.primaryText}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-slate-50 p-2"><b>{ad.countries.join(", ")}</b><br />Ülke</div>
                <div className="rounded-xl bg-slate-50 p-2"><b>€{ad.estimatedSpendMin ?? "—"}</b><br />Min spend</div>
                <div className="rounded-xl bg-slate-50 p-2"><b>{ad.adScore}</b><br />Score</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
