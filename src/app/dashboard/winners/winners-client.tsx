"use client";
import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AdCreativeMedia } from "@/components/ad-creative-media";
import { WINNER_TIER_LABELS, type WinnerScore, type WinnerTier } from "@/lib/winner-score";
import type { WinningAdAnalysis } from "@/lib/openai-analysis";

type Row = {
  id: string;
  brand: string | null;
  brandLogoUrl: string | null;
  headline: string | null;
  primaryText: string | null;
  landingUrl: string | null;
  adLibraryUrl: string | null;
  mediaType: string;
  status: string;
  daysRunning: number | null;
  countries: string[];
  creative: any;
  winner: WinnerScore;
  isLocked: boolean;
};

const TIER_STYLES: Record<WinnerTier, string> = {
  KAZANAN: "bg-emerald-100 text-emerald-800",
  POTANSIYEL: "bg-amber-100 text-amber-800",
  TEST: "bg-slate-100 text-slate-700"
};

const ERRORS: Record<string, string> = {
  PLAN_REQUIRED: "Yapay zekâ analizi ücretli planlarda açık.",
  OPENAI_NOT_CONFIGURED: "Yapay zekâ servisi henüz yapılandırılmamış (OPENAI_API_KEY eksik).",
  OPENAI_TIMEOUT: "Yapay zekâ zamanında yanıt vermedi, tekrar deneyin.",
  RATE_LIMITED: "Çok fazla istek gönderildi, biraz bekleyin."
};

function copy(text: string) {
  navigator.clipboard?.writeText(text).catch(() => undefined);
}

function AnalysisPanel({ adId, canAnalyze }: { adId: string; canAnalyze: boolean }) {
  const [market, setMarket] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<WinningAdAnalysis | null>(null);

  async function run() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/ads/${adId}/winner-analysis`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetMarket: market.trim() || undefined }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "AI_ANALYSIS_FAILED");
      setAnalysis(data.data.analysis);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "AI_ANALYSIS_FAILED";
      setError(ERRORS[code] || `Analiz başarısız: ${code}`);
    } finally { setBusy(false); }
  }

  if (!canAnalyze) return <Link href="/pricing" className="mt-4 block rounded-2xl bg-violet-700 px-4 py-3 text-center text-sm font-black text-white">Neden kazandı + varyasyon üret (ücretli plan)</Link>;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      {!analysis && (
        <div className="flex flex-wrap gap-2">
          <input value={market} onChange={(event) => setMarket(event.target.value)} placeholder="Hedef pazar (ör. Türkiye, Almanya)" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button type="button" onClick={run} disabled={busy} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Analiz ediliyor..." : "Neden kazandı + varyasyon üret"}</button>
        </div>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
      {analysis && (
        <div className="space-y-4 text-sm">
          <p className="font-bold text-slate-900">{analysis.verdict}</p>
          <div>
            <div className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">Neden tutuyor</div>
            <ul className="list-disc space-y-1 pl-5 text-slate-700">{analysis.whyItWins.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-black text-slate-500">Kanca</div>{analysis.hook}</div>
            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-black text-slate-500">Teklif</div>{analysis.offer}</div>
            <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs font-black text-slate-500">Kitle</div>{analysis.audience}</div>
          </div>
          <div>
            <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Varyasyonlar</div>
            <div className="space-y-3">
              {analysis.variations.map((variation, index) => {
                const text = `${variation.headline}\n\n${variation.primaryText}`;
                return (
                  <div key={index} className="rounded-2xl border border-violet-100 bg-violet-50/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-black text-violet-900">{index + 1}. {variation.title}</div>
                      <button type="button" onClick={() => copy(text)} className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-bold text-violet-700">Kopyala</button>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">Pazar: {variation.market} · Kanca: {variation.hook}</div>
                    <div className="mt-2 font-bold">{variation.headline}</div>
                    <p className="mt-1 whitespace-pre-line text-slate-700">{variation.primaryText}</p>
                    <p className="mt-2 text-xs text-slate-600"><b>Görsel/video fikri:</b> {variation.visualIdea}</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">Test planı</div>
            <ol className="list-decimal space-y-1 pl-5 text-slate-700">{analysis.testPlan.map((item) => <li key={item}>{item}</li>)}</ol>
          </div>
        </div>
      )}
    </div>
  );
}

export function WinnersClient({ q, country, tier, countries, rows, counts, total, canAnalyze }: {
  q: string;
  country: string;
  tier: WinnerTier | "ALL";
  countries: ReadonlyArray<readonly [string, string]>;
  rows: Row[];
  counts: Record<WinnerTier, number>;
  total: number;
  canAnalyze: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black">Kazanan Reklamlar</h1>
        <p className="mt-1 max-w-3xl text-slate-500">Uzun süredir yayında olan, hâlâ aktif kalan ve çok varyasyonu olan reklamlar para kazandırıyor demektir. Her reklam bu sinyallerle 0-100 arası puanlanır. Kazananı bulun, neden tuttuğunu yapay zekâya açıklatın ve aynı kalıpla kendi varyasyonlarınızı üretin.</p>
      </div>

      <form className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-soft md:grid-cols-[1fr_200px_200px_120px]">
        <input name="q" defaultValue={q} placeholder="Anahtar kelime veya marka (ör. halı yıkama)" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <select name="country" defaultValue={country} aria-label="Ülke" className="rounded-2xl border border-slate-200 px-4 py-3">
          {countries.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <select name="tier" defaultValue={tier} aria-label="Seviye" className="rounded-2xl border border-slate-200 px-4 py-3">
          <option value="KAZANAN">Sadece kazananlar</option><option value="POTANSIYEL">Potansiyel</option><option value="TEST">Test aşamasında</option><option value="ALL">Hepsi</option>
        </select>
        <button className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">Bul</button>
      </form>

      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        <Card><div className="text-sm text-slate-500">İncelenen reklam</div><div className="mt-1 text-3xl font-black">{total}</div></Card>
        <Card><div className="text-sm text-slate-500">Kazanan</div><div className="mt-1 text-3xl font-black text-emerald-600">{counts.KAZANAN}</div></Card>
        <Card><div className="text-sm text-slate-500">Potansiyel</div><div className="mt-1 text-3xl font-black text-amber-600">{counts.POTANSIYEL}</div></Card>
        <Card><div className="text-sm text-slate-500">Test aşamasında</div><div className="mt-1 text-3xl font-black text-slate-600">{counts.TEST}</div></Card>
      </div>

      {rows.length === 0 && <Card><p className="text-sm text-slate-600">Bu filtreyle reklam bulunamadı. Önce <Link href="/dashboard/ads" className="font-bold text-violet-700">Reklamlar</Link> sayfasından arama yaparak veri çekin, sonra buraya dönün.</p></Card>}

      <div className="grid gap-5 md:grid-cols-2">
        {rows.map((row) => (
          <Card key={row.id} className="relative overflow-hidden">
            {row.isLocked && <div className="absolute inset-0 z-10 grid place-items-center bg-white/70 backdrop-blur-[2px]"><Link href="/pricing" className="rounded-2xl bg-violet-700 px-5 py-3 font-black text-white">Tüm kazananları aç</Link></div>}
            <div className={row.isLocked ? "locked-blur" : ""}>
              <div className="flex gap-4">
                <AdCreativeMedia creative={row.creative} className="h-32 w-32 shrink-0 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${TIER_STYLES[row.winner.tier]}`}>{WINNER_TIER_LABELS[row.winner.tier]}</span>
                    <span className="text-2xl font-black text-slate-900">{row.winner.score}<span className="text-sm text-slate-400">/100</span></span>
                  </div>
                  <div className="mt-2 truncate font-black">{row.headline || row.brand || "Başlıksız reklam"}</div>
                  <div className="text-sm font-semibold text-slate-500">{row.brand} · {row.mediaType} · {row.daysRunning ?? "—"} gün · {row.status === "ACTIVE" ? "Aktif" : "Pasif"}</div>
                  <div className="mt-1 text-xs text-slate-500">{row.winner.variantCount} varyasyon{row.winner.platforms.length ? ` · ${row.winner.platforms.join(", ")}` : ""}{row.countries.length ? ` · ${row.countries.slice(0, 4).join(", ")}` : ""}</div>
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-slate-600">{row.primaryText}</p>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">{row.winner.reasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                {row.landingUrl && <a href={row.landingUrl} target="_blank" rel="noreferrer noopener" className="rounded-lg bg-slate-100 px-2 py-1 text-slate-700">Hedef sayfa ↗</a>}
                {row.adLibraryUrl && <a href={row.adLibraryUrl} target="_blank" rel="noreferrer noopener" className="rounded-lg bg-slate-100 px-2 py-1 text-slate-700">Reklam kütüphanesi ↗</a>}
                {canAnalyze && openId !== row.id && <button type="button" onClick={() => setOpenId(row.id)} className="rounded-lg bg-violet-100 px-2 py-1 text-violet-800">Yapay zekâ ile analiz et</button>}
              </div>
              {(openId === row.id || !canAnalyze) && !row.isLocked && <AnalysisPanel adId={row.id} canAnalyze={canAnalyze} />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
