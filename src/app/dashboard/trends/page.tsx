import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { TrendsClient } from "./trends-client";

function countBy(values: (string | null | undefined)[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value || "Bilinmiyor", (counts.get(value || "Bilinmiyor") || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function TrendsPage() {
  await requireUser();
  const [ads, stores, history] = await Promise.all([
    prisma.ad.findMany({ select: { niche: true, mediaType: true, countries: true, status: true, daysRunning: true, firstSeenAt: true }, orderBy: { updatedAt: "desc" }, take: 500 }),
    prisma.store.findMany({ select: { niche: true, monthlyVisitGrowth: true, name: true, country: true }, orderBy: { monthlyVisitGrowth: "desc" }, take: 20 }),
    prisma.trendSnapshot.findMany({ orderBy: { date: "desc" }, take: 14 })
  ]);
  const active = ads.filter((ad) => ad.status === "ACTIVE");
  const longRunners = ads.filter((ad) => (ad.daysRunning || 0) >= 30);
  const newAds = ads.filter((ad) => ad.firstSeenAt && Date.now() - ad.firstSeenAt.getTime() <= 14 * 86_400_000);
  const niches = countBy(ads.map((ad) => ad.niche));
  const media = countBy(ads.map((ad) => ad.mediaType));
  const countries = countBy(ads.flatMap((ad) => ad.countries));

  return <TrendsClient ads={ads} active={active} longRunners={longRunners} newAds={newAds} niches={niches} media={media} countries={countries} stores={stores} history={history} />;
}
