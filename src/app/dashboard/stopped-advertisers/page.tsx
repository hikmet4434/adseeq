import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { planFromUser } from "@/lib/plans";
import { AD_COUNTRIES, AD_COUNTRY_CODES } from "@/lib/countries";
import { adSearchDatabaseTerms } from "@/lib/ad-search";
import { findStoppedAdvertisers } from "@/lib/stopped-advertisers";
import { StoppedAdvertisersClient } from "./stopped-advertisers-client";

const FREE_VISIBLE_ROWS = 5;

export default async function StoppedAdvertisersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const plan = planFromUser(user as never);
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const requestedCountry = params.country?.toUpperCase();
  const country = requestedCountry && AD_COUNTRY_CODES.has(requestedCountry) ? requestedCountry : "ALL";

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

  // Anahtar kelimeyle eşleşen markaları bulup, durumlarına markanın TÜM reklamlarıyla
  // karar verilir; aksi halde başka konuda aktif reklamı olan marka "durmuş" sanılır.
  const matched = await prisma.ad.findMany({ where, select: { brandPageId: true }, distinct: ["brandPageId"], take: 3000 });
  const brandIds = matched.map((item) => item.brandPageId).filter((id): id is string => Boolean(id));
  const ads = brandIds.length ? await prisma.ad.findMany({
    where: { brandPageId: { in: brandIds } },
    select: {
      brandPageId: true, status: true, daysRunning: true, firstSeenAt: true, lastSeenAt: true, landingUrl: true, headline: true, countries: true,
      brandPage: { select: { name: true, logoUrl: true, pageUrl: true, websiteDomain: true, contactEmails: true, contactPhones: true, contactSocials: true, contactCheckedAt: true } }
    },
    take: 20000
  }) : [];

  const advertisers = findStoppedAdvertisers(ads.map((ad) => ({
    brandPageId: ad.brandPageId,
    brandName: ad.brandPage?.name || null,
    brandLogoUrl: ad.brandPage?.logoUrl || null,
    brandPageUrl: ad.brandPage?.pageUrl || null,
    brandWebsite: ad.brandPage?.websiteDomain || null,
    contactEmails: ad.brandPage?.contactEmails,
    contactPhones: ad.brandPage?.contactPhones,
    contactSocials: ad.brandPage?.contactSocials,
    contactCheckedAt: ad.brandPage?.contactCheckedAt,
    status: ad.status,
    daysRunning: ad.daysRunning,
    firstSeenAt: ad.firstSeenAt,
    lastSeenAt: ad.lastSeenAt,
    landingUrl: ad.landingUrl,
    headline: ad.headline,
    countries: ad.countries
  }))).slice(0, 300);

  const isPaid = user.role === "ADMIN" || Boolean(plan?.code && plan.code !== "FREE");
  const rows = advertisers.map((advertiser, index) => {
    const locked = !isPaid && index >= FREE_VISIBLE_ROWS;
    return {
      ...advertiser,
      lastAdEndedAt: advertiser.lastAdEndedAt?.toISOString() || null,
      contactCheckedAt: advertiser.contactCheckedAt?.toISOString() || null,
      website: locked ? null : advertiser.website,
      emails: locked ? [] : advertiser.emails,
      phones: locked ? [] : advertiser.phones,
      socials: locked ? [] : advertiser.socials,
      brandPageUrl: locked ? null : advertiser.brandPageUrl,
      isLocked: locked
    };
  });

  return <StoppedAdvertisersClient q={q} country={country} countries={AD_COUNTRIES} rows={rows} isPaid={isPaid} brandCount={brandIds.length} />;
}
