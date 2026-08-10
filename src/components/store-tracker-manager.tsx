"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type TrackedStoreItem = {
  id: string;
  store: {
    id: string;
    name: string;
    domain: string;
    estRevenue30dMax: number | null;
    products: { title: string }[];
  };
};

export function StoreTrackerManager({ tracked, limit }: { tracked: TrackedStoreItem[]; limit: number | null }) {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function addStore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("add"); setMessage("");
    try {
      const response = await fetch("/api/tracked-stores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "STORE_TRACKER_FAILED");
      setDomain(""); setError(false); setMessage("Mağaza takip listesine eklendi."); router.refresh();
    } catch (caught) {
      setError(true); setMessage(caught instanceof Error ? caught.message : "Mağaza eklenemedi.");
    } finally { setBusy(null); }
  }

  async function removeStore(id: string) {
    setBusy(id); setMessage("");
    try {
      const response = await fetch(`/api/tracked-stores/${id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "STORE_TRACKER_FAILED");
      setError(false); setMessage("Mağaza takip listesinden çıkarıldı."); router.refresh();
    } catch (caught) {
      setError(true); setMessage(caught instanceof Error ? caught.message : "Mağaza çıkarılamadı.");
    } finally { setBusy(null); }
  }

  return (
    <div>
      <form onSubmit={addStore} className="mb-4 flex flex-col gap-3 sm:flex-row">
        <input value={domain} onChange={(event) => setDomain(event.target.value)} required placeholder="ornek-magaza.com" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3" />
        <button disabled={busy !== null} className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white disabled:opacity-50">{busy === "add" ? "Ekleniyor…" : "Mağazayı takip et"}</button>
      </form>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-slate-500">Yalnızca AdSeeQ veritabanında bulunan domainler eklenebilir.</span><span className="rounded-full bg-violet-50 px-3 py-1 font-bold text-violet-700">{tracked.length} / {limit === null ? "∞" : limit}</span></div>
      {message && <div className={`mb-4 rounded-xl p-3 text-sm font-semibold ${error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{message}</div>}
      <div className="space-y-3">
        {tracked.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><a href={`/dashboard/stores/${item.store.id}`} className="min-w-0"><div className="truncate font-black">{item.store.name}</div><div className="truncate text-sm text-slate-500">{item.store.domain} · {item.store.products.map((product) => product.title).join(", ") || "Bestseller yok"} · €{item.store.estRevenue30dMax?.toLocaleString() || "—"} est.</div></a><button type="button" disabled={busy !== null} onClick={() => removeStore(item.id)} className="shrink-0 rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-50">{busy === item.id ? "Çıkarılıyor…" : "Takibi bırak"}</button></div>)}
        {!tracked.length && <div className="rounded-2xl bg-amber-50 p-4 text-amber-800">Henüz takip edilen mağaza yok.</div>}
      </div>
    </div>
  );
}
