import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { StoreDetailClient } from "./store-detail-client";

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  await requireUser();
  const store = await prisma.store.findUnique({
    where: { id: resolvedParams.id },
    include: { products: true, snapshots: { orderBy: { date: "asc" } }, pixels: true, apps: true, brandPages: { include: { ads: { include: { creatives: { take: 1 } }, take: 12 } } } }
  });
  if (!store) notFound();
  const similar = await prisma.store.findMany({ where: { id: { not: store.id }, niche: store.niche }, take: 8, orderBy: { monthlyVisits: "desc" } });
  const ads = store.brandPages.flatMap((p) => p.ads);
  return (
    <StoreDetailClient
      store={{
        name: store.name,
        domain: store.domain,
        country: store.country,
        niche: store.niche,
        logoUrl: store.logoUrl,
        shopUrl: store.shopUrl,
        monthlyVisitsLabel: store.monthlyVisits?.toLocaleString() ?? "—",
        revenueMinLabel: store.estRevenue30dMin?.toLocaleString() ?? "—",
        revenueMaxLabel: store.estRevenue30dMax?.toLocaleString() ?? "—",
        productCount: store.productCount ?? 0,
      }}
      adsCount={ads.length}
      ads={ads.map((ad) => ({ id: ad.id, headline: ad.headline, rankPercentile: ad.rankPercentile, daysRunning: ad.daysRunning, creative: ad.creatives[0] ?? null }))}
      products={store.products.map((p) => ({ id: p.id, title: p.title, currency: p.currency, price: p.price }))}
      pixels={store.pixels.map((p) => ({ id: p.id, type: p.type }))}
      apps={store.apps.map((a) => ({ id: a.id, name: a.name }))}
      similar={similar.map((s) => ({ id: s.id, name: s.name, visitsLabel: s.monthlyVisits?.toLocaleString() ?? "—" }))}
    />
  );
}
