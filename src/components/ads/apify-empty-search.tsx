"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RESULT_LIMIT = 10;
const MAX_COST_USD = 0.1;

export function ApifyEmptySearch({ query }: { query: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function importFromApify() {
    if (!window.confirm(`“${query}” için Apify'dan en fazla ${RESULT_LIMIT} reklam getirilsin mi? Harcama üst sınırı $${MAX_COST_USD.toFixed(2)}.`)) return;

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ingest/apify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          searchTerms: [query],
          country: "ALL",
          adActiveStatus: "ACTIVE",
          mediaType: "ALL",
          maxResults: RESULT_LIMIT,
          maxCostUsd: MAX_COST_USD,
          scrapeAdDetails: true,
          includeAboutPage: false
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "APIFY_INGEST_FAILED");

      setError(false);
      setMessage(`${data.imported} reklam işlendi. Sonuçlar yenileniyor…`);
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
      <h2 className="text-xl font-black">“{query}” için kayıtlı reklam bulunamadı</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
        Bu arama önce WinningHunter veritabanını kontrol eder. Yeni Meta reklamlarını Apify üzerinden getirip aynı aramaya ekleyebilirsiniz.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={importFromApify}
        className="mt-5 rounded-2xl bg-violet-700 px-5 py-3 font-black text-white disabled:cursor-wait disabled:opacity-50"
      >
        {busy ? "Apify'dan getiriliyor…" : "Apify'dan 10 reklam getir"}
      </button>
      <p className="mt-2 text-xs text-slate-500">Harcama üst sınırı: $0.10 · Yalnızca yöneticiler</p>
      {message && <p className={`mt-3 text-sm font-semibold ${error ? "text-rose-600" : "text-emerald-700"}`}>{message}</p>}
    </div>
  );
}
