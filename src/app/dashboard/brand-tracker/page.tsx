import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { planFromUser, getFeatureLimit } from "@/lib/plans";
import { BrandTrackerClient } from "./brand-tracker-client";

export default async function BrandTrackerPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const query = (await searchParams).q?.trim();
  const where: Prisma.BrandPageWhereInput = query ? {
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { websiteDomain: { contains: query, mode: "insensitive" } },
      { niche: { contains: query, mode: "insensitive" } }
    ]
  } : {};
  const [brands, tracked, alerts] = await Promise.all([
    prisma.brandPage.findMany({
      where,
      include: {
        ads: { orderBy: { firstSeenAt: "desc" }, take: 3, select: { id: true, headline: true, status: true, mediaType: true, daysRunning: true } },
        _count: { select: { ads: true } }
      },
      orderBy: { ads: { _count: "desc" } },
      take: 40
    }),
    prisma.trackedBrand.findMany({ where: { userId: user.id } }),
    prisma.brandAlert.findMany({ where: { userId: user.id }, include: { trackedBrand: { include: { brandPage: true } } }, orderBy: { createdAt: "desc" }, take: 20 })
  ]);
  const trackedByBrand = new Map(tracked.map((item) => [item.brandPageId, item.id]));
  const limit = getFeatureLimit(planFromUser(user as any), "followed_brands");

  return <BrandTrackerClient query={query} brands={brands} tracked={tracked} alerts={alerts} trackedByBrand={trackedByBrand} limit={limit} />;
}
