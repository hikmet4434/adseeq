import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";
import { checkAndConsumeQuota } from "@/lib/quota";
import { maskAdForPlan } from "@/lib/locked-response";
import { planFromUser } from "@/lib/plans";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const plan = planFromUser(user as any);
  const quota = await checkAndConsumeQuota({ userId: user.id, plan, metric: "ads_search_daily" });
  if (!quota.allowed) return NextResponse.json({ error: "QUOTA_EXCEEDED", usage: quota, upgradeRequired: true }, { status: 403 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(60, Math.max(1, Number(url.searchParams.get("limit") || 24)));
  const status = url.searchParams.get("status");
  const niche = url.searchParams.get("niche");
  const mediaType = url.searchParams.get("mediaType");
  const country = url.searchParams.get("country");
  const sort = url.searchParams.get("sort") || "lastSeen_desc";

  const where: Prisma.AdWhereInput = {};
  if (status) where.status = status as any;
  if (niche) where.niche = { contains: niche, mode: "insensitive" };
  if (mediaType) where.mediaType = mediaType as any;
  if (country) where.countries = { has: country };
  if (q) {
    where.OR = [
      { primaryText: { contains: q, mode: "insensitive" } },
      { headline: { contains: q, mode: "insensitive" } },
      { brandPage: { name: { contains: q, mode: "insensitive" } } }
    ];
  }

  const orderBy: Prisma.AdOrderByWithRelationInput =
    sort === "rank_asc" ? { rankPercentile: "asc" } : sort === "days_desc" ? { daysRunning: "desc" } : { lastSeenAt: "desc" };

  const [total, rows, saved] = await Promise.all([
    prisma.ad.count({ where }),
    prisma.ad.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { brandPage: true, creatives: { take: 1 } }
    }),
    prisma.savedAd.findMany({ where: { userId: user.id }, select: { adId: true } })
  ]);

  const savedIds = new Set(saved.map((s) => s.adId));
  const data = rows.map((ad) =>
    maskAdForPlan(
      {
        id: ad.id,
        source: ad.source,
        status: ad.status,
        mediaType: ad.mediaType,
        adScore: ad.adScore,
        primaryText: ad.primaryText,
        headline: ad.headline,
        ctaText: ad.ctaText,
        landingUrl: ad.landingUrl,
        productUrl: ad.productUrl,
        language: ad.language,
        countries: ad.countries,
        niche: ad.niche,
        daysRunning: ad.daysRunning,
        estimatedReachMin: ad.estimatedReachMin,
        estimatedReachMax: ad.estimatedReachMax,
        estimatedSpendMin: ad.estimatedSpendMin,
        estimatedSpendMax: ad.estimatedSpendMax,
        rankPercentile: ad.rankPercentile,
        brand: ad.brandPage && { id: ad.brandPage.id, name: ad.brandPage.name, logoUrl: ad.brandPage.logoUrl },
        thumbnailUrl: ad.creatives[0]?.thumbnailUrl || ad.creatives[0]?.url,
        isSaved: savedIds.has(ad.id)
      },
      plan?.code
    )
  );

  return NextResponse.json({ data, pagination: { page, limit, total }, usage: quota });
}
