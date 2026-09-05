"use client";
import { Card } from "@/components/ui/card";
import { AdCreativeMedia } from "@/components/ad-creative-media";
import { useT } from "@/lib/i18n";

export function SavedAdsClient({ folders, saved }: { folders: any[]; saved: any[] }) {
  const t = useT();
  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">{t("savedAds.title")}</h1>
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Card>
          <h2 className="mb-3 font-black">{t("savedAds.folders")}</h2>
          <div className="space-y-2">
            <div className="rounded-xl bg-violet-50 p-3 font-bold text-violet-700">{t("savedAds.allAds")} ({saved.length})</div>
            {folders.map((f) => <div key={f.id} className="rounded-xl bg-slate-50 p-3 font-bold">{f.name}</div>)}
          </div>
        </Card>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {saved.map((s) => (
            <Card key={s.id}>
              <AdCreativeMedia creative={s.ad.creatives[0]} className="mb-4 h-40 w-full rounded-2xl object-cover" />
              <div className="font-black">{s.ad.headline}</div>
              <div className="text-sm text-slate-500">{s.ad.brandPage?.name} · {s.folder?.name || t("savedAds.all")}</div>
              <p className="mt-2 line-clamp-2 text-sm">{s.ad.primaryText}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}