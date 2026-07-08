import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";

export default async function StoresPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q?.trim();
  const niche = resolvedSearchParams.niche;
  const where: Prisma.StoreWhereInput = {};
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { domain: { contains: q, mode: "insensitive" } }];
  if (niche) where.niche = niche;
  const stores = await prisma.store.findMany({ where, include: { products: { where: { isBestSeller: true }, take: 2 }, brandPages: { include: { _count: { select: { ads: true } } }, take: 1 } }, orderBy: { estRevenue30dMax: "desc" }, take: 50 });
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black">Explore Stores</h1>
        <p className="mt-1 text-slate-500">Shopify mağazalarını trafik, gelir, niche ve aktif reklam sayısıyla keşfet.</p>
      </div>
      <form className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-soft md:grid-cols-[1fr_220px_120px]">
        <input name="q" defaultValue={q} placeholder="petpro, beauty, supplements..." className="rounded-2xl border border-slate-200 px-4 py-3" />
        <select name="niche" defaultValue={niche || ""} className="rounded-2xl border border-slate-200 px-4 py-3"><option value="">Tüm niche</option><option>Pets</option><option>Beauty</option><option>Supplements</option><option>Household</option></select>
        <button className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">Ara</button>
      </form>
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="p-4">Shop Info</th><th>Best Sellers</th><th>Niche</th><th>Monthly Visits</th><th>Est. Revenue 30d</th><th>Meta Ads</th><th></th></tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="p-4"><div className="flex items-center gap-3"><img src={s.logoUrl || ""} className="h-10 w-10 rounded-xl" /><div><div className="font-black">{s.name}</div><div className="text-slate-500">{s.domain} · {s.country}</div></div></div></td>
                  <td>{s.products.map((p) => p.title).join(", ")}</td>
                  <td>{s.niche}</td>
                  <td>{s.monthlyVisits?.toLocaleString()} <span className="text-emerald-600">+{s.monthlyVisitGrowth}%</span></td>
                  <td>€{s.estRevenue30dMin?.toLocaleString()}–€{s.estRevenue30dMax?.toLocaleString()}</td>
                  <td>{s.brandPages[0]?._count.ads || 0}</td>
                  <td><Link href={`/dashboard/stores/${s.id}`} className="font-bold text-violet-700">Details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
