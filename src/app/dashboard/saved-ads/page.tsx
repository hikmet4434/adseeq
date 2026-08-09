import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";
import { AdCreativeMedia } from "@/components/ad-creative-media";

export default async function SavedAdsPage() {
  const user = await requireUser();
  const folders = await prisma.savedFolder.findMany({ where: { userId: user.id } });
  const saved = await prisma.savedAd.findMany({ where: { userId: user.id }, include: { folder: true, ad: { include: { brandPage: true, creatives: { take: 1 } } } }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">Saved Ads</h1>
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Card>
          <h2 className="mb-3 font-black">Folders</h2>
          <div className="space-y-2"><div className="rounded-xl bg-violet-50 p-3 font-bold text-violet-700">All Saved Ads ({saved.length})</div>{folders.map((f) => <div key={f.id} className="rounded-xl bg-slate-50 p-3 font-bold">{f.name}</div>)}</div>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {saved.map((s) => <Card key={s.id}><AdCreativeMedia creative={s.ad.creatives[0]} className="mb-4 h-40 w-full rounded-2xl object-cover" /><div className="font-black">{s.ad.headline}</div><div className="text-sm text-slate-500">{s.ad.brandPage?.name} · {s.folder?.name || "All"}</div><p className="mt-2 line-clamp-2 text-sm">{s.ad.primaryText}</p></Card>)}
        </div>
      </div>
    </div>
  );
}
