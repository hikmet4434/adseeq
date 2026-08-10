import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function startOfUtcDay() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function captureTrendSnapshot() {
  const [ads, stores, tiktok] = await Promise.all([
    prisma.ad.findMany({ select: { niche: true, mediaType: true, countries: true, status: true, daysRunning: true, firstSeenAt: true } }),
    prisma.store.aggregate({ _count: true, _avg: { monthlyVisitGrowth: true, monthlyVisits: true } }),
    prisma.tikTokProduct.aggregate({ _count: true, _sum: { soldCount: true }, _avg: { rating: true, price: true } })
  ]);
  const count = (values: string[]) => Object.fromEntries([...values.reduce((map, value) => map.set(value || "Bilinmiyor", (map.get(value || "Bilinmiyor") || 0) + 1), new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 20));
  const metrics = {
    ads: { total: ads.length, active: ads.filter((ad) => ad.status === "ACTIVE").length, longRunners: ads.filter((ad) => (ad.daysRunning || 0) >= 30).length, new14d: ads.filter((ad) => ad.firstSeenAt && Date.now() - ad.firstSeenAt.getTime() <= 14 * 86_400_000).length },
    niches: count(ads.map((ad) => ad.niche || "Bilinmiyor")), media: count(ads.map((ad) => ad.mediaType)), countries: count(ads.flatMap((ad) => ad.countries)),
    stores: { total: stores._count, avgGrowth: stores._avg.monthlyVisitGrowth, avgVisits: stores._avg.monthlyVisits },
    tiktok: { total: tiktok._count, sold: tiktok._sum.soldCount, avgRating: tiktok._avg.rating, avgPrice: tiktok._avg.price }
  };
  return prisma.trendSnapshot.upsert({ where: { date: startOfUtcDay() }, create: { date: startOfUtcDay(), metrics: metrics as Prisma.InputJsonValue }, update: { metrics: metrics as Prisma.InputJsonValue } });
}

async function sendAlertEmail(email: string, title: string, brand: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ALERT_FROM_EMAIL?.trim();
  if (!key || !from) return false;
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [email], subject: `${brand}: yeni reklam`, html: `<p><strong>${brand}</strong> için yeni reklam bulundu.</p><p>${title}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/brand-tracker">AdSeeQ'da görüntüle</a></p>` }) });
  return response.ok;
}

export async function createBrandAlerts() {
  const tracked = await prisma.trackedBrand.findMany({ include: { user: { select: { email: true } }, brandPage: { include: { ads: { orderBy: { createdAt: "desc" }, take: 20 } } } } });
  let created = 0;
  for (const item of tracked) {
    for (const ad of item.brandPage.ads) {
      if (ad.createdAt < item.createdAt && (!ad.firstSeenAt || ad.firstSeenAt < item.createdAt)) continue;
      const title = ad.headline || ad.primaryText?.slice(0, 100) || "Yeni kreatif";
      const unique = { userId: item.userId, trackedBrandId: item.id, adId: ad.id, type: "NEW_AD" };
      if (await prisma.brandAlert.findUnique({ where: { userId_trackedBrandId_adId_type: unique } })) continue;
      await prisma.brandAlert.create({ data: { ...unique, title, details: { brand: item.brandPage.name, mediaType: ad.mediaType } } });
      await prisma.notification.create({ data: { userId: item.userId, type: "BRAND_NEW_AD", title: `${item.brandPage.name}: yeni reklam`, body: title, link: "/dashboard/brand-tracker" } });
      await sendAlertEmail(item.user.email, title, item.brandPage.name).catch(() => false);
      created += 1;
    }
  }
  return created;
}
