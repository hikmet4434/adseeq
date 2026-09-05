import { prisma } from "@/lib/db";
import { ConversionSignalAd, ProductConversionResult, rankProductsByConversionCost } from "@/lib/conversion-finder";

export type ConversionRanking = {
  country: string;
  adCount: number;
  productCount: number;
  results: ProductConversionResult[];
};

export async function loadConversionRanking(country: string, limit = 100): Promise<ConversionRanking> {
  const ads = await prisma.ad.findMany({
    where: { countries: { has: country }, externalAdId: { not: { startsWith: "demo_ad_" } } },
    include: { brandPage: { select: { id: true, name: true, logoUrl: true } }, creatives: { orderBy: { position: "asc" }, take: 1 } },
    orderBy: [{ daysRunning: "desc" }, { updatedAt: "desc" }],
    take: 3000
  });
  const signals: ConversionSignalAd[] = ads.map((ad) => ({
    id: ad.id,
    headline: ad.headline,
    primaryText: ad.primaryText,
    description: ad.description,
    landingUrl: ad.landingUrl,
    productUrl: ad.productUrl,
    mediaType: ad.mediaType,
    status: ad.status,
    daysRunning: ad.daysRunning,
    firstSeenAt: ad.firstSeenAt,
    brandPageId: ad.brandPageId,
    brandName: ad.brandPage?.name || null,
    brandLogoUrl: ad.brandPage?.logoUrl || null,
    thumbnailUrl: ad.creatives[0]?.thumbnailUrl || ad.creatives[0]?.url || null
  }));
  const results = rankProductsByConversionCost(signals, limit);
  return { country, adCount: ads.length, productCount: new Set(results.map((item) => item.key)).size, results };
}

// FREE plan: ilk 5 ürün tam görünür, kalanı kilitli (ad, marka, endeks görünür; bağlantı ve tahmin gizli).
export function maskRankingForPlan(results: ProductConversionResult[], planCode: string | undefined, isAdmin: boolean) {
  const unlocked = isAdmin || (planCode && planCode !== "FREE");
  return results.map((item, index) => {
    if (unlocked || index < 5) return { ...item, isLocked: false };
    return { ...item, landingUrl: null, adLibraryUrl: null, estimatedCpaTry: null, reasons: [], sampleAdIds: [], isLocked: true };
  });
}
