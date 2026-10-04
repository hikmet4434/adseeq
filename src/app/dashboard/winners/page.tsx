import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { planFromUser } from "@/lib/plans";
import { AD_COUNTRIES, AD_COUNTRY_CODES } from "@/lib/countries";
import { adSearchDatabaseTerms } from "@/lib/ad-search";
import { WinnerTier, rankWinners } from "@/lib/winner-score";
import { WinnersClient } from "./winners-client";

export default async function WinnersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const plan = planFromUser(user as never);
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const requestedCountry = params.country?.toUpperCase();
  const country = requestedCountry && AD_COUNTRY_CODES.has(requestedCountry) ? requestedCountry : "ALL";
  const tier = (["KAZANAN", "POTANSIYEL", "TEST", "ALL"] as const).includes(params.tier as never) ? params.tier as WinnerTier | "ALL" : "KAZANAN";

  const where: Prisma.AdWhereInput = { brandPageId: { not: null } };
  if (q) {
    where.AND = adSearchDatabaseTerms(q, "ALL_WORDS").map((variants) => ({ OR: variants.flatMap((term) => [
      { primaryText: { contains: term, mode: "insensitive" as const } },
      { headline: { contains: term, mode: "insensitive" as const } },
      { brandPage: { name: { contains: term, mode: "insensitive" as const } } }
    ]) }));
  }
  if (country !== "ALL") where.countries = { has: country };
  const realAdsExist = await prisma.ad.count({ where: { externalAdId: { not: { startsWith: "demo_ad_" } } } }) > 0;
  if (realAdsExist) where.externalAdId = { not: { startsWith: "demo_ad_" } };

  const ads = await prisma.ad.findMany({
    where,
    include: { brandPage: true, creatives: { where: { url: { not: "" } }, orderBy: { position: "asc" }, take: 1 } },
    orderBy: { daysRunning: "desc" },
    take: 800
  });
  const ranked = rankWinners(ads);
  const filtered = ranked.filter((item) => tier === "ALL" || item.winner.tier === tier).slice(0, 60);
  const isAdmin = user.role === "ADMIN";
  const canAnalyze = isAdmin || Boolean(plan?.code && plan.code !== "FREE");
  const isFree = !canAnalyze;

  const rows = filtered.map(({ ad, winner }, index) => ({
    id: ad.id,
    brand: ad.brandPage?.name || null,
    brandLogoUrl: ad.brandPage?.logoUrl || null,
    headline: ad.headline,
    primaryText: isFree && index >= 6 ? (ad.primaryText ? `${ad.primaryText.slice(0, 90)}...` : null) : ad.primaryText,
    landingUrl: isFree ? null : ad.landingUrl,
    adLibraryUrl: isFree ? null : ad.productUrl,
    mediaType: ad.mediaType,
    status: ad.status,
    daysRunning: ad.daysRunning,
    countries: ad.countries,
    creative: ad.creatives[0] || null,
    winner,
    isLocked: isFree && index >= 6
  }));

  const counts = { KAZANAN: 0, POTANSIYEL: 0, TEST: 0 } as Record<WinnerTier, number>;
  for (const item of ranked) counts[item.winner.tier] += 1;

  return <WinnersClient q={q} country={country} tier={tier} countries={AD_COUNTRIES} rows={rows} counts={counts} total={ranked.length} canAnalyze={canAnalyze} />;
}
