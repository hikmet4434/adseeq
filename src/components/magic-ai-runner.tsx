"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

export function MagicAiRunner() {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function analyze() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/magic-ai/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: query.trim() || undefined }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "AI_ANALYSIS_FAILED");
      setMessage(t("ai.analysisSaved")); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : t("ai.analysisFailed")); }
    finally { setBusy(false); }
  }
  return <div className="mb-5 flex flex-wrap gap-3 rounded-3xl bg-white p-4 shadow-soft"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ai.inputPlaceholder")} className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3" /><button type="button" onClick={analyze} disabled={busy} className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? t("ai.analyzing") : t("ai.realAnalysis")}</button>{message && <p className="w-full text-sm font-semibold text-violet-700">{message}</p>}</div>;
}
