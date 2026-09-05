"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

const RESULT_LIMIT = 10;
const RESULT_OPTIONS = [10, 25, 50, 100];

export function ApifyEmptySearch({ query, country, mediaType, matchMode, status, planLimit, existingCount = 0 }: { query: string; country: string; mediaType: string; matchMode: "ALL_WORDS" | "EXACT_PHRASE"; status: "ACTIVE" | "INACTIVE" | "ALL"; planLimit: number; existingCount?: number }) {
  const router = useRouter();
  const t = useT();
  const [maxResults, setMaxResults] = useState(RESULT_LIMIT);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [waitSeconds, setWaitSeconds] = useState(0);

  useEffect(() => {
    if (!busy) { setWaitSeconds(0); return; }
    const startedAt = Date.now();
    const interval = window.setInterval(() => setWaitSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, [busy]);

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
      if (!response.ok) throw new Error(t("apifyEmpty.scanFailed"));

      setError(false);
      const prepared = data.mediaEnriched ?? data.imported ?? 0;
      setMessage(prepared > 0
        ? t("apifyEmpty.successPrepared", { received: data.received, relevant: data.relevant, prepared })
        : t("apifyEmpty.successNoCreative", { received: data.received, relevant: data.relevant }));
      router.refresh();
    } catch (caught) {
      setError(true);
      setMessage(caught instanceof Error && caught.message !== t("apifyEmpty.scanFailed") ? caught.message : t("apifyEmpty.scanFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50/60 p-8 text-center md:col-span-2 xl:col-span-3">
      <h2 className="text-xl font-black">{existingCount > 0 ? t("apifyEmpty.bringMore", { query }) : t("apifyEmpty.noneFound", { query })}</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
        {existingCount > 0
          ? t("apifyEmpty.showingExisting", { count: existingCount })
          : t("apifyEmpty.dbFirst")}
      </p>
      <div className="mx-auto mt-5 flex max-w-sm gap-2">
        <label className="sr-only" htmlFor="apify-result-count">{t("apifyEmpty.resultCount")}</label>
        <select
          id="apify-result-count"
          value={maxResults}
          disabled={busy}
          onChange={(event) => setMaxResults(Number(event.target.value))}
          className="min-w-0 flex-1 rounded-2xl border border-violet-200 bg-white px-4 py-3 font-bold"
        >
          {RESULT_OPTIONS.filter((count) => count <= planLimit).map((count) => <option key={count} value={count}>{t("apifyEmpty.adsCount", { count })}</option>)}
        </select>
        <button
          type="button"
          disabled={busy || planLimit === 0}
          onClick={importFromApify}
          className="rounded-2xl bg-violet-700 px-5 py-3 font-black text-white disabled:cursor-wait disabled:opacity-50"
        >
          {busy ? (waitSeconds >= 8 ? t("apifyEmpty.preparingVideos") : t("apifyEmpty.scanningMeta")) : planLimit === 0 ? t("apifyEmpty.upgradePlan") : existingCount > 0 ? t("apifyEmpty.bringMoreBtn") : t("apifyEmpty.bring")}
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">{t("apifyEmpty.liveMeta")} · {country === "ALL" ? t("apifyEmpty.allWorld") : country} · {mediaType === "ALL" ? t("apifyEmpty.allMedia") : mediaType} · {matchMode === "EXACT_PHRASE" ? t("apifyEmpty.exactPhrase") : t("apifyEmpty.allWords")} · {t("apifyEmpty.planLimit")}: {planLimit || t("apifyEmpty.noAccess")} </p>
      {busy && <p className="mt-2 text-xs font-semibold text-violet-700">{t("apifyEmpty.busyNote")}</p>}
      {message && <p className={`mt-3 text-sm font-semibold ${error ? "text-rose-600" : "text-emerald-700"}`}>{message}</p>}
    </div>
  );
}
