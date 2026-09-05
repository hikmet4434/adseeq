"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

export function BrandTrackerActions({ brandPageId, trackingId }: { brandPageId: string; trackingId?: string }) {
  const router = useRouter();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(trackingId ? `/api/tracked-brands/${trackingId}` : "/api/tracked-brands", {
        method: trackingId ? "DELETE" : "POST",
        headers: trackingId ? undefined : { "content-type": "application/json" },
        body: trackingId ? undefined : JSON.stringify({ brandPageId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "BRAND_TRACKER_FAILED");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("common.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`rounded-xl px-4 py-2 text-sm font-black disabled:opacity-50 ${trackingId ? "bg-slate-100 text-slate-700" : "bg-violet-700 text-white"}`}
      >
        {busy ? t("common.loading") : trackingId ? t("brand.untrack") : t("brand.track")}
      </button>
      {error && <div className="mt-1 max-w-48 text-xs font-semibold text-rose-600">{error}</div>}
    </div>
  );
}
