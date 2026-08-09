"use client";
import { useState } from "react";

export function CheckoutButton({ planCode }: { planCode: "BASIC" | "STANDARD" | "PREMIUM" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planCode, interval: "monthly" }) });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) { window.location.href = "/login?next=/pricing"; return; }
      if (!response.ok || !data.url) throw new Error(data.error || "CHECKOUT_FAILED");
      window.location.href = data.url;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Ödeme başlatılamadı."); setBusy(false); }
  }
  return <><button type="button" onClick={checkout} disabled={busy} className="mt-6 w-full rounded-xl bg-violet-700 px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? "Yönlendiriliyor…" : "Satın al"}</button>{error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}</>;
}
