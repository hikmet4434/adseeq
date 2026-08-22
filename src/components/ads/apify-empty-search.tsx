"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RESULT_LIMIT = 10;
const RESULT_OPTIONS = [10, 25, 50, 100];

export function ApifyEmptySearch({ query, country, mediaType, matchMode, status, planLimit, existingCount = 0 }: { query: string; country: string; mediaType: string; matchMode: "ALL_WORDS" | "EXACT_PHRASE"; status: "ACTIVE" | "INACTIVE" | "ALL"; planLimit: number; existingCount?: number }) {
  const router = useRouter();
  const [maxResults, setMaxResults] = useState(RESULT_LIMIT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function importFromApify() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/ads/import-apify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          searchTerm: query,
          country,
          mediaType,
          matchMode,
          status,
          maxResults
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "APIFY_INGEST_FAILED");

      setError(false);
      setMessage(`${data.received} aday tarandı, ${data.relevant} ilgili reklam bulundu. Sonuçlar yenileniyor…`);
      router.refresh();
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error ? caught.message : "Apify içe aktarması başarısız oldu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50/60 p-8 text-center md:col-span-2 xl:col-span-3">
      <h2 className="text-xl font-black">{existingCount > 0 ? `Daha fazla “${query}” reklamı getir` : `“${query}” için kayıtlı reklam bulunamadı`}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
        {existingCount > 0
          ? `Şu anda ${existingCount} ilgili reklam gösteriliyor. Yeni Meta reklamlarını aynı detaylı filtrelerle Apify üzerinden tarayabilirsiniz.`
          : "Bu arama önce AdSeeQ veritabanını kontrol eder. Yeni Meta reklamlarını seçtiğiniz ülke ve medya türüyle Apify üzerinden getirip aynı aramaya ekleyebilirsiniz."}
      </p>
      <div className="mx-auto mt-5 flex max-w-sm gap-2">
        <label className="sr-only" htmlFor="apify-result-count">Getirilecek reklam adedi</label>
        <select
          id="apify-result-count"
          value={maxResults}
          disabled={busy}
          onChange={(event) => setMaxResults(Number(event.target.value))}
          className="min-w-0 flex-1 rounded-2xl border border-violet-200 bg-white px-4 py-3 font-bold"
        >
          {RESULT_OPTIONS.filter((count) => count <= planLimit).map((count) => <option key={count} value={count}>{count} reklam</option>)}
        </select>
        <button
          type="button"
          disabled={busy || planLimit === 0}
          onClick={importFromApify}
          className="rounded-2xl bg-violet-700 px-5 py-3 font-black text-white disabled:cursor-wait disabled:opacity-50"
        >
          {busy ? "Getiriliyor…" : planLimit === 0 ? "Planı yükselt" : existingCount > 0 ? "Daha fazla getir" : "Getir"}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Apify · {country === "ALL" ? "Tüm dünya" : country} · {mediaType === "ALL" ? "Tüm medya" : mediaType} · {matchMode === "EXACT_PHRASE" ? "Tam ifade" : "Tüm kelimeler"} · Plan limiti: {planLimit || "erişim yok"} reklam</p>
      {message && <p className={`mt-3 text-sm font-semibold ${error ? "text-rose-600" : "text-emerald-700"}`}>{message}</p>}
    </div>
  );
}
