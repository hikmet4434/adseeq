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
import { AdSearchMatchMode, adSearchDatabaseTerms, adSearchRelevance } from "@/lib/ad-search";
import { AdsClient } from "./ads-client";

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
    const terms = adSearchDatabaseTerms(q, matchMode);
    where.AND = terms.map((variants) => ({ OR: variants.flatMap((term) => [
      { primaryText: { contains: term, mode: "insensitive" as const } },
      { headline: { contains: term, mode: "insensitive" as const } },
      { description: { contains: term, mode: "insensitive" as const } },
      { brandPage: { name: { contains: term, mode: "insensitive" as const } } }
    ]) }));
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

  return <AdsClient plan={plan} q={q} niche={niche} mediaType={mediaType} country={country} status={status} matchMode={matchMode} minDays={minDays} language={language} sort={sort} ads={masked} apifyPlanLimit={apifyPlanLimit} />;
}
