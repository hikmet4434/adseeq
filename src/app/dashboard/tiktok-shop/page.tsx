import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { planFromUser } from "@/lib/plans";
import { TikTokShopClient } from "./tiktok-shop-client";

function opportunityScore(product: { soldCount: number | null; rating: number | null; reviewCount: number | null; price: number | null }) {
  const sales = Math.min(45, Math.log10(Math.max(1, product.soldCount || 1)) * 10);
  const reviews = Math.min(15, Math.log10(Math.max(1, product.reviewCount || 1)) * 4);
  const rating = Math.min(20, Math.max(0, (product.rating || 0) * 4));
  const priceFit = product.price && product.price >= 15 && product.price <= 80 ? 20 : 8;
  return Math.min(99, Math.round(sales + reviews + rating + priceFit));
}

export default async function TikTokShopPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const plan = planFromUser(user as never);
  const planLimit = user.role === "ADMIN" || plan?.code === "PREMIUM" ? 50 : plan?.code === "STANDARD" ? 25 : plan?.code === "BASIC" ? 10 : 0;
  const resolved = await searchParams;
  const q = resolved.q?.trim();
  const region = resolved.region?.trim();
  const where: Prisma.TikTokProductWhereInput = {
    ...(region ? { region } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { shopName: { contains: q, mode: "insensitive" } }, { category: { contains: q, mode: "insensitive" } }] } : {})
  };
  const products = await prisma.tikTokProduct.findMany({ where, orderBy: [{ soldCount: "desc" }, { lastSeenAt: "desc" }], take: 60 });
  const ranked = products.map((product) => ({ ...product, score: opportunityScore(product) })).sort((a, b) => b.score - a.score);
  const regions = [...new Set(products.map((product) => product.region).filter(Boolean))] as string[];
  return <TikTokShopClient planLimit={planLimit} q={q} region={region} ranked={ranked} regions={regions} />;
}
