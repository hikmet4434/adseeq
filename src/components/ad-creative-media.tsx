import { MediaType } from "@prisma/client";

type Creative = {
  type: MediaType;
  url: string;
  thumbnailUrl?: string | null;
};

export function AdCreativeMedia({ creative, className }: { creative?: Creative | null; className?: string }) {
  const classes = className || "h-44 w-full rounded-2xl object-cover";
  if (!creative) {
    return <div className={`${classes} grid place-items-center bg-slate-100 text-sm font-semibold text-slate-400`}>Kreatif bulunamadı</div>;
  }

  if (creative.type === MediaType.VIDEO) {
    return (
      <video controls playsInline preload="metadata" poster={creative.thumbnailUrl || undefined} className={classes}>
        <source src={creative.url} />
        Tarayıcınız video oynatmayı desteklemiyor.
      </video>
    );
  }

  return <img src={creative.thumbnailUrl || creative.url} alt="Reklam kreatifi" loading="lazy" className={classes} />;
}
