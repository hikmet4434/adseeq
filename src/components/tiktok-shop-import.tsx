"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

export function TikTokShopImport({ planLimit }: { planLimit: number }) {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("US");
  const [count, setCount] = useState(Math.min(10, planLimit || 10));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function run() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/tiktok-shop/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, region, maxResults: count }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "TIKTOK_IMPORT_FAILED");
      setMessage(`${data.imported} ${t("tiktok.productsUpdated")}`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : t("tiktok.importFailed")); }
    finally { setBusy(false); }
  }
  return <div className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-soft md:grid-cols-[1fr_120px_130px_130px]">
    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("tiktok.searchPlaceholder")} className="rounded-2xl border border-slate-200 px-4 py-3" />
    <select value={region} onChange={(e) => setRegion(e.target.value)} className="rounded-2xl border border-slate-200 px-3"><option>US</option><option>GB</option><option>SG</option><option>MY</option><option>PH</option><option>TH</option><option>VN</option><option>ID</option></select>
    <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="rounded-2xl border border-slate-200 px-3">{[10,25,50].filter((v) => v <= planLimit).map((v) => <option key={v} value={v}>{v} {t("tiktok.products")}</option>)}</select>
    <button type="button" onClick={run} disabled={busy || planLimit === 0 || query.trim().length < 2} className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? t("tiktok.fetching") : planLimit ? t("tiktok.fetchLive") : t("tiktok.upgradePlan")}</button>
    {message && <p className="text-sm font-semibold text-violet-700 md:col-span-4">{message}</p>}
  </div>;
}
