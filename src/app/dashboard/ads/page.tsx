import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { maskAdForPlan } from "@/lib/locked-response";
import { planFromUser } from "@/lib/plans";
import { Card } from "@/components/ui/card";

export default async function AdsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const plan = planFromUser(user as any);
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q?.trim();
  const niche = resolvedSearchParams.niche;
  const mediaType = resolvedSearchParams.mediaType;
  const where: Prisma.AdWhereInput = {};
  if (q) where.OR = [{ primaryText: { contains: q, mode: "insensitive" } }, { headline: { contains: q, mode: "insensitive" } }, { brandPage: { name: { contains: q, mode: "insensitive" } } }];
  if (niche) where.niche = niche;
  if (mediaType) where.mediaType = mediaType as any;
  const ads = await prisma.ad.findMany({ where, include: { brandPage: true, creatives: { take: 1 }, savedBy: { where: { userId: user.id } } }, orderBy: { rankPercentile: "asc" }, take: 48 });
  const isAdmin = user.role === "ADMIN";
  const masked = ads.map((ad) => maskAdForPlan({ ...ad, isSaved: ad.savedBy.length > 0 }, plan?.code, isAdmin));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Search Meta Adlibrary</h1>
          <p className="mt-1 text-slate-500">Kazanan Meta reklamlarını keyword, niche ve medya tipine göre keşfet.</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">Plan: <b>{plan?.name}</b> · Free ise kartlar kilitli</div>
      </div>
      <form className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-soft md:grid-cols-[1fr_180px_180px_120px]">
        <input name="q" defaultValue={q} placeholder="dog collar, skincare, greens..." className="rounded-2xl border border-slate-200 px-4 py-3" />
        <select name="niche" defaultValue={niche || ""} className="rounded-2xl border border-slate-200 px-4 py-3">
          <option value="">Tüm niche</option><option>Pets</option><option>Beauty</option><option>Supplements</option><option>Household</option>
        </select>
        <select name="mediaType" defaultValue={mediaType || ""} className="rounded-2xl border border-slate-200 px-4 py-3">
          <option value="">Tüm medya</option><option>VIDEO</option><option>IMAGE</option><option>CAROUSEL</option>
        </select>
        <button className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">Ara</button>
      </form>
      <div className="mb-5 flex flex-wrap gap-2">
        {["Week's biggest winners", "US winners", "Dropship Ads", "Supplements", "Top Branded"].map((x) => <span key={x} className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-800">{x}</span>)}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {masked.map((ad: any) => (
          <Card key={ad.id} className="relative overflow-hidden">
            {ad.isLocked && <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-[2px]"><Link href="/pricing" className="rounded-2xl bg-violet-700 px-5 py-3 font-black text-white">Start now — Unlock winners</Link></div>}
            <div className={ad.isLocked ? "locked-blur" : ""}>
              <img src={ad.creatives[0]?.thumbnailUrl || "https://placehold.co/640x480"} alt="" className="mb-4 h-44 w-full rounded-2xl object-cover" />
              <div className="mb-2 flex items-center justify-between">
                <div className="font-black">{ad.headline}</div>
                <div className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Top %{Math.round(ad.rankPercentile || 0)}</div>
              </div>
              <div className="text-sm font-semibold text-slate-500">{ad.brandPage?.name} · {ad.mediaType} · {ad.daysRunning} gün</div>
              <p className="mt-3 line-clamp-3 text-sm text-slate-600">{ad.primaryText}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl bg-slate-50 p-2"><b>{ad.countries.join(", ")}</b><br />Ülke</div>
                <div className="rounded-xl bg-slate-50 p-2"><b>€{ad.estimatedSpendMin ?? "—"}</b><br />Min spend</div>
                <div className="rounded-xl bg-slate-50 p-2"><b>{ad.adScore}</b><br />Score</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
