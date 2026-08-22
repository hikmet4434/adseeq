"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function ApifyIngestForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const searchTerms = String(form.get("searchTerms") || "").split(",").map((term) => term.trim()).filter(Boolean);
    const maxResults = Number(form.get("maxResults"));
    const maxCostUsd = Number(form.get("maxCostUsd"));
    if (!window.confirm(`${searchTerms.join(", ")} için en fazla ${maxResults} reklam çekilsin mi? Harcama üst sınırı $${maxCostUsd.toFixed(2)}.`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/ingest/apify", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ searchTerms, country: form.get("country"), adActiveStatus: form.get("adActiveStatus"), mediaType: form.get("mediaType"), maxResults, maxCostUsd, scrapeAdDetails: form.get("scrapeAdDetails") === "on", includeAboutPage: form.get("includeAboutPage") === "on" })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("Canlı reklam taraması başarısız oldu.");
      setError(false); setMessage(`${data.imported} reklam işlendi, ${data.failed} kayıt atlandı.`); router.refresh();
    } catch (caught) {
      setError(true); setMessage(caught instanceof Error ? caught.message : "İşlem başarısız");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 lg:grid-cols-2">
      <input name="searchTerms" required minLength={2} maxLength={500} placeholder="Anahtar kelimeler: skincare, dog collar" className="rounded-xl border border-slate-200 px-3 py-3 lg:col-span-2" />
      <div className="grid grid-cols-2 gap-2">
        <input name="country" defaultValue="ALL" required maxLength={3} placeholder="ALL / TR / US" className="rounded-xl border border-slate-200 px-3 py-3 uppercase" />
        <select name="adActiveStatus" defaultValue="ACTIVE" className="rounded-xl border border-slate-200 bg-white px-3"><option>ACTIVE</option><option>ALL</option><option>INACTIVE</option></select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select name="mediaType" defaultValue="ALL" className="rounded-xl border border-slate-200 bg-white px-3"><option>ALL</option><option>VIDEO</option><option>IMAGE</option><option>MEME</option></select>
        <input name="maxResults" type="number" min="1" max="1000" defaultValue="100" required className="rounded-xl border border-slate-200 px-3 py-3" />
      </div>
      <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold"><input name="scrapeAdDetails" type="checkbox" defaultChecked /> Yaratıcı/CTA detaylarını al</label>
      <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm font-semibold"><input name="includeAboutPage" type="checkbox" /> Reklamveren detaylarını al</label>
      <label className="text-sm font-semibold text-slate-600">Harcama üst sınırı (USD)<input name="maxCostUsd" type="number" min="0.1" max="10" step="0.1" defaultValue="1" required className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3" /></label>
      <button disabled={busy || !configured} className="self-end rounded-xl bg-violet-700 px-4 py-3 font-bold text-white disabled:opacity-40">{!configured ? "Veri kaynağı ayarı bekleniyor" : busy ? "Veriler taranıyor..." : "Reklamları çek"}</button>
      {message && <p className={`text-sm font-semibold lg:col-span-2 ${error ? "text-rose-600" : "text-emerald-600"}`}>{message}</p>}
    </form>
  );
}
