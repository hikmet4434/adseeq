import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { planFromUser } from "@/lib/plans";
import { Card } from "@/components/ui/card";
import { TikTokShopImport } from "@/components/tiktok-shop-import";

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
  return <div>
    <div className="mb-6"><h1 className="text-3xl font-black">TikTok Shop</h1><p className="mt-1 text-slate-500">Apify üzerinden canlı ürün, satış, fiyat, mağaza ve değerlendirme sinyalleri.</p></div>
    <TikTokShopImport planLimit={planLimit} />
    <form className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-soft md:grid-cols-[1fr_180px_120px]">
      <input name="q" defaultValue={q} placeholder="Kayıtlı ürün veya mağaza ara" className="rounded-2xl border border-slate-200 px-4 py-3" />
      <select name="region" defaultValue={region || ""} className="rounded-2xl border border-slate-200 px-4 py-3"><option value="">Tüm bölgeler</option>{regions.map((item) => <option key={item}>{item}</option>)}</select>
      <button className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">Filtrele</button>
    </form>
    <div className="mb-5 grid gap-4 sm:grid-cols-3"><Card><div className="text-sm text-slate-500">Canlı ürün</div><div className="mt-1 text-3xl font-black">{ranked.length}</div></Card><Card><div className="text-sm text-slate-500">Mağaza</div><div className="mt-1 text-3xl font-black">{new Set(ranked.map((item) => item.shopExternalId || item.shopName)).size}</div></Card><Card><div className="text-sm text-slate-500">Toplam satış sinyali</div><div className="mt-1 text-3xl font-black">{ranked.reduce((sum, item) => sum + (item.soldCount || 0), 0).toLocaleString("tr-TR")}</div></Card></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ranked.map((product) => <Card key={product.id}>
      {product.imageUrl ? <img src={product.imageUrl} alt="" className="mb-4 h-44 w-full rounded-2xl object-cover" /> : <div className="mb-4 grid h-44 place-items-center rounded-2xl bg-slate-100 text-slate-400">Ürün görseli yok</div>}
      <div className="flex items-start justify-between gap-3"><div><h2 className="font-black">{product.title}</h2><p className="text-sm text-slate-500">{product.shopName || "Mağaza bilinmiyor"} · {product.region}</p></div><span className="rounded-full bg-fuchsia-50 px-3 py-1 text-sm font-black text-fuchsia-700">{product.score}</span></div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-slate-50 p-2"><b>{product.price ? `${product.price} ${product.currency || ""}` : "—"}</b><br />Fiyat</div><div className="rounded-xl bg-slate-50 p-2"><b>{(product.soldCount || 0).toLocaleString("tr-TR")}</b><br />Satış</div><div className="rounded-xl bg-slate-50 p-2"><b>{product.rating || "—"}</b><br />Puan</div></div>
      {product.productUrl && <a href={product.productUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-bold text-violet-700">TikTok’ta aç →</a>}
    </Card>)}{!ranked.length && <Card className="text-center text-slate-500 md:col-span-2 xl:col-span-3">Yukarıdan bir ürün aratıp canlı veriyi getirin.</Card>}</div>
  </div>;
}
