"use client";

import { MediaType } from "@prisma/client";
import { useEffect, useState } from "react";

type Creative = {
  id: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string | null;
};

export function AdCreativeMedia({ creative, className }: { creative?: Creative | null; className?: string }) {
  const [videoFailed, setVideoFailed] = useState(false);
  useEffect(() => setVideoFailed(false), [creative?.id]);
  const classes = className || "h-44 w-full rounded-2xl object-cover";
  if (!creative) {
    return <div className={`${classes} grid place-items-center bg-slate-100 text-sm font-semibold text-slate-400`}>Kreatif bulunamadı</div>;
  }

  if (creative.type === MediaType.VIDEO) {
    if (videoFailed) {
      return (
        <div className={`${classes} relative overflow-hidden bg-slate-900`}>
          {creative.thumbnailUrl && <img src={creative.thumbnailUrl} alt="Video önizlemesi" className="h-full w-full object-cover opacity-70" />}
          <div className="absolute inset-0 grid place-items-center bg-slate-950/45 px-4 text-center text-sm font-bold text-white">
            Video bağlantısı yenilenemedi. Aynı aramayı tekrar getirerek medyayı güncelleyebilirsiniz.
          </div>
        </div>
      );
    }
    return (
      <video controls playsInline preload="metadata" poster={creative.thumbnailUrl || undefined} className={classes} onError={() => setVideoFailed(true)}>
        <source src={`/api/ads/media/${encodeURIComponent(creative.id)}`} />
        Tarayıcınız video oynatmayı desteklemiyor.
      </video>
    );
  }

  return <img src={creative.thumbnailUrl || creative.url} alt="Reklam kreatifi" loading="lazy" className={classes} />;
}
