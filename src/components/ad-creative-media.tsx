"use client";

import { MediaType } from "@prisma/client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

type Creative = {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string | null;
};

export function AdCreativeMedia({ creative, className }: { creative?: Creative | null; className?: string }) {
  const t = useT();
  const [videoFailed, setVideoFailed] = useState(false);
  useEffect(() => setVideoFailed(false), [creative?.id]);
  const classes = className || "h-44 w-full rounded-2xl object-cover";
  if (!creative) {
    return <div className={`${classes} grid place-items-center bg-slate-100 text-sm font-semibold text-slate-400`}>{t("ads.noCreative")}</div>;
  }

  if (creative.type === MediaType.VIDEO) {
    if (videoFailed) {
      return (
        <div className={`${classes} relative overflow-hidden bg-slate-900`}>
          {creative.thumbnailUrl && <img src={creative.thumbnailUrl} alt={t("media.videoPreview")} className="h-full w-full object-cover opacity-70" />}
          <div className="absolute inset-0 grid place-items-center bg-slate-950/45 px-4 text-center text-sm font-bold text-white">
            {t("ads.videoRefresh")}
          </div>
        </div>
      );
    }
    return (
      <video controls playsInline preload="metadata" poster={creative.thumbnailUrl || undefined} className={classes} onError={() => setVideoFailed(true)}>
        <source src={`/api/ads/media/${encodeURIComponent(creative.id)}`} />
        {t("ads.videoNotSupported")}
      </video>
    );
  }

  return <img src={creative.thumbnailUrl || creative.url} alt={t("meta.creative")} loading="lazy" className={classes} />;
}
