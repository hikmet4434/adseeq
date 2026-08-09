import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";

function opportunityScore(product: { isBestSeller: boolean; price: number | null; store: { monthlyVisitGrowth: number | null; monthlyVisits: number | null } }) {
  const growth = Math.max(0, product.store.monthlyVisitGrowth || 0);
  const traffic = Math.min(25, Math.log10(Math.max(1, product.store.monthlyVisits || 1)) * 4);
  const priceFit = product.price && product.price >= 15 && product.price <= 80 ? 20 : 8;
  return Math.min(99, Math.round(20 + growth + traffic + priceFit + (product.isBestSeller ? 15 : 0)));
}

export default async function TikTokShopPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const resolved = await searchParams;
  const q = resolved.q?.trim();
  const country = resolved.country?.trim();
  const where: Prisma.StoreProductWhereInput = {
    store: { pixels: { some: { type: { contains: "TikTok", mode: "insensitive" } } }, ...(country ? { country } : {}) },
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { store: { name: { contains: q, mode: "insensitive" } } }] } : {})
  };
  const products = await prisma.storeProduct.findMany({ where, include: { store: true }, take: 60 });
  const ranked = products.map((product) => ({ ...product, score: opportunityScore(product) })).sort((a, b) => b.score - a.score);
  const countries = [...new Set(products.map((product) => product.store.country).filter(Boolean))] as string[];

  return (
    <div>
      <div className="mb-6"><h1 className="text-3xl font-black">TikTok Shop</h1><p className="mt-1 text-slate-500">TikTok Pixel bulunan mağazalardaki ürünleri büyüme, trafik, fiyat ve bestseller sinyalleriyle sırala.</p></div>
      <form className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-soft md:grid-cols-[1fr_180px_120px]">
        <input name="q" defaultValue={q} placeholder="Ürün veya mağaza ara" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <select name="country" defaultValue={country || ""} className="rounded-2xl border border-slate-200 px-4 py-3"><option value="">Tüm ülkeler</option>{countries.map((item) => <option key={item}>{item}</option>)}</select>
        <button className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">Filtrele</button>
      </form>
      <div className="mb-5 grid gap-4 sm:grid-cols-3"><Card><div className="text-sm text-slate-500">Ürün sinyali</div><div className="mt-1 text-3xl font-black">{ranked.length}</div></Card><Card><div className="text-sm text-slate-500">TikTok Pixel mağazası</div><div className="mt-1 text-3xl font-black">{new Set(ranked.map((item) => item.storeId)).size}</div></Card><Card><div className="text-sm text-slate-500">Ortalama fırsat skoru</div><div className="mt-1 text-3xl font-black">{ranked.length ? Math.round(ranked.reduce((sum, item) => sum + item.score, 0) / ranked.length) : 0}</div></Card></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{ranked.map((product) => <Card key={product.id}>
        {product.imageUrl ? <img src={product.imageUrl} alt="" className="mb-4 h-44 w-full rounded-2xl object-cover" /> : <div className="mb-4 grid h-44 place-items-center rounded-2xl bg-slate-100 text-slate-400">Ürün görseli yok</div>}
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-black">{product.title}</h2><p className="text-sm text-slate-500">{product.store.name} · {product.store.country}</p></div><span className="rounded-full bg-fuchsia-50 px-3 py-1 text-sm font-black text-fuchsia-700">{product.score}</span></div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-xl bg-slate-50 p-2"><b>{product.price ? `${product.price} ${product.currency || product.store.currency || ""}` : "—"}</b><br />Fiyat</div><div className="rounded-xl bg-slate-50 p-2"><b>{product.store.monthlyVisitGrowth || 0}%</b><br />Büyüme</div><div className="rounded-xl bg-slate-50 p-2"><b>{product.isBestSeller ? "Evet" : "Hayır"}</b><br />Bestseller</div></div>
      </Card>)}{!ranked.length && <Card className="text-center text-slate-500 md:col-span-2 xl:col-span-3">TikTok Pixel sinyalli ürün bulunamadı.</Card>}</div>
    </div>
  );
}
