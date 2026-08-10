type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
};

export function BrandLogo({
  className = "",
  markClassName = "h-9 w-9",
  showWordmark = true
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="AdSeeQ">
      <span className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-violet-700 text-white shadow-sm ${markClassName}`}>
        <svg viewBox="0 0 32 32" className="h-[72%] w-[72%]" aria-hidden="true">
          <circle cx="14.5" cy="14.5" r="8" fill="none" stroke="currentColor" strokeWidth="3.4" />
          <path d="M20.4 20.4 27 27" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3.4" />
          <path d="M10.5 14.7 13.2 17.4 18.8 11.8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-xl font-black tracking-[-0.035em] text-slate-950">
          AdSee<span className="text-violet-700">Q</span>
        </span>
      )}
    </span>
  );
}
