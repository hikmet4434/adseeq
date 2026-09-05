"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PER_TERM_OPTIONS = [10, 25, 50];

export function ConversionScanPanel({ country, defaultTerms, canScan }: { country: string; defaultTerms: readonly string[]; canScan: boolean }) {
  const router = useRouter();
  const [terms, setTerms] = useState<string[]>([...defaultTerms]);
  const [customTerm, setCustomTerm] = useState("");
  const [perTerm, setPerTerm] = useState(25);
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!busy) { setSeconds(0); return; }
    const startedAt = Date.now();
    const interval = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, [busy]);

  function toggleTerm(term: string) {
    setTerms((current) => current.includes(term) ? current.filter((item) => item !== term) : [...current, term].slice(0, 10));
  }

  function addCustomTerm() {
    const value = customTerm.trim();
    if (value.length < 2 || terms.includes(value) || terms.length >= 10) return;
    setTerms((current) => [...current, value]);
    setCustomTerm("");
  }

  async function runScan() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/conversion-finder/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ country, terms, perTerm })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const code = typeof data.error === "string" ? data.error : "";
        throw new Error(code.endsWith("NOT_CONFIGURED") ? "Canlı tarama için Meta/Apify anahtarları sunucuda tanımlı değil." : code === "UPGRADE_REQUIRED" ? "Canlı tarama için ücretli plan gerekir." : code.includes("QUOTA") || code.includes("CREDITS") ? "Günlük arama veya aylık API kredi limitine ulaşıldı." : "Pazar taraması başarısız oldu.");
      }
      setError(false);
      setMessage(`${data.scannedTerms} terim tarandı, ${data.imported} reklam eklendi${data.failedTerms ? `, ${data.failedTerms} terim başarısız` : ""}. Sıralama yenileniyor…`);
      router.refresh();
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "Pazar taraması başarısız oldu.");
    } finally {
      setBusy(false);
    }
  }

  const allTerms = [...new Set([...defaultTerms, ...terms])];
  return (
    <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Türkiye pazarını canlı tara</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">Seçili niyet terimleriyle Meta Ad Library taranır, bulunan reklamlar veritabanına eklenir ve sıralama yeniden hesaplanır. Her terim seçilen adet kadar API kredisi kullanır.</p>
        </div>
        <div className="flex gap-2">
          <select value={perTerm} disabled={busy} onChange={(event) => setPerTerm(Number(event.target.value))} aria-label="Terim başına reklam" className="rounded-2xl border border-violet-200 bg-white px-3 py-2 text-sm font-bold">
            {PER_TERM_OPTIONS.map((count) => <option key={count} value={count}>{count} reklam / terim</option>)}
          </select>
          <button type="button" disabled={busy || !canScan || terms.length === 0} onClick={runScan} className="rounded-2xl bg-violet-700 px-5 py-2 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? `Taranıyor… ${seconds}s` : canScan ? `${terms.length} terimi tara` : "Planı yükselt"}
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {allTerms.map((term) => {
          const active = terms.includes(term);
          return <button key={term} type="button" disabled={busy} onClick={() => toggleTerm(term)} className={`rounded-full px-3 py-1 text-sm font-semibold ${active ? "bg-violet-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>{term}</button>;
        })}
      </div>
      <div className="mt-3 flex max-w-md gap-2">
        <input value={customTerm} disabled={busy} onChange={(event) => setCustomTerm(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomTerm(); } }} placeholder="Özel terim ekle (örn. cilt bakım seti)" className="min-w-0 flex-1 rounded-2xl border border-violet-200 bg-white px-4 py-2 text-sm" />
        <button type="button" disabled={busy} onClick={addCustomTerm} className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Ekle</button>
      </div>
      {busy && <p className="mt-3 text-xs font-semibold text-violet-700">Her terim 15–60 saniye sürebilir; {terms.length} terim için birkaç dakika bekleyin.</p>}
      {message && <p className={`mt-3 text-sm font-semibold ${error ? "text-rose-600" : "text-emerald-700"}`}>{message}</p>}
    </div>
  );
}
