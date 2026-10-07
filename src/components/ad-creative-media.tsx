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

// Meta bağlantıları süresi dolunca hem video hem kapak görseli açılmaz. Video
// kaynağı doğrudan <video src> ile verilir ki hata olayı <video> üzerinde tetiklensin
// (<source> kullanıldığında hata <video>'ya ulaşmaz ve oynatıcı siyah kalır).
export function AdCreativeMedia({ creative: initialCreative, className, adLibraryUrl }: { creative?: Creative | null; className?: string; adLibraryUrl?: string | null }) {
  const t = useT();
  const [creative, setCreative] = useState(initialCreative);
  const [videoFailed, setVideoFailed] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    setCreative(initialCreative);
    setVideoFailed(false);
    setPosterFailed(false);
    setImageFailed(false);
    setRefreshFailed(false);
  }, [initialCreative?.id]);

  const classes = className || "h-44 w-full rounded-2xl object-cover";
  if (!creative) {
    return <div className={`${classes} grid place-items-center bg-slate-100 text-sm font-semibold text-slate-400`}>{t("ads.noCreative")}</div>;
  }

  async function refresh() {
    if (!creative) return;
    setRefreshing(true);
    setRefreshFailed(false);
    try {
      const response = await fetch(`/api/ads/media/${encodeURIComponent(creative.id)}/refresh`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.data) throw new Error(data.error || "MEDIA_REFRESH_FAILED");
      setCreative(data.data);
      setVideoFailed(false);
      setPosterFailed(false);
      setImageFailed(false);
    } catch {
      setRefreshFailed(true);
    } finally {
      setRefreshing(false);
    }
  }

  const poster = creative.thumbnailUrl && !posterFailed ? creative.thumbnailUrl : null;

  if (creative.type === MediaType.VIDEO && !videoFailed) {
    return (
      <>
        {/* Kapak görseli bozuksa siyah kare yerine gri arka plan gösterilir. */}
        {poster && <img src={poster} alt="" hidden onError={() => setPosterFailed(true)} />}
        <video
          key={creative.id}
          controls
          playsInline
          preload="metadata"
          poster={poster || undefined}
          src={`/api/ads/media/${encodeURIComponent(creative.id)}`}
          className={`${classes} bg-slate-200`}
          onError={() => setVideoFailed(true)}
        >
          {t("ads.videoNotSupported")}
        </video>
      </>
    );
  }

  const isBrokenVideo = creative.type === MediaType.VIDEO;
  const imageSrc = isBrokenVideo ? poster : (creative.thumbnailUrl || creative.url);
  if (!isBrokenVideo && imageSrc && !imageFailed) {
    return <img src={imageSrc} alt={t("meta.creative")} loading="lazy" className={classes} onError={() => setImageFailed(true)} referrerPolicy="no-referrer" />;
  }

  return (
    <div className={`${classes} relative overflow-hidden bg-gradient-to-br from-slate-700 to-slate-900`}>
      {imageSrc && !imageFailed && <img src={imageSrc} alt="" className="h-full w-full object-cover opacity-50" onError={() => setImageFailed(true)} referrerPolicy="no-referrer" />}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-xs font-bold text-white">
        <span>{isBrokenVideo ? t("ads.videoExpired") : t("ads.noCreative")}</span>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={refresh} disabled={refreshing} className="rounded-lg bg-white px-2 py-1 text-slate-900 disabled:opacity-60">{refreshing ? t("ads.videoRefreshing") : isBrokenVideo ? t("ads.videoRefreshButton") : t("ads.imageRefreshButton")}</button>
          {adLibraryUrl && <a href={adLibraryUrl} target="_blank" rel="noreferrer noopener" className="rounded-lg bg-white/20 px-2 py-1">{t("ads.watchOnMeta")}</a>}
        </div>
        {refreshFailed && <span className="font-semibold text-amber-200">{t("ads.videoRefreshFailed")}</span>}
      </div>
    </div>
  );
}
