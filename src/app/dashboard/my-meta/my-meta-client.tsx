"use client";
import { FormEvent, useState } from "react";
import { Card } from "@/components/ui/card";
import { VERDICT_LABELS, type AccountAdResult, type AccountAdVerdict } from "@/lib/meta-account";

type Result = {
  adAccountId: string;
  ads: AccountAdResult[];
  ai: { summary: string; insights: Array<{ title: string; action: string; confidence: number }> } | null;
  aiError: string | null;
};

const VERDICT_STYLES: Record<AccountAdVerdict, string> = {
  TUTUYOR: "bg-emerald-100 text-emerald-800",
  IZLE: "bg-amber-100 text-amber-800",
  TUTMUYOR: "bg-rose-100 text-rose-800",
  VERI_AZ: "bg-slate-100 text-slate-600"
};

const ERRORS: Record<string, string> = {
  META_TOKEN_INVALID: "Erişim anahtarı geçersiz ya da süresi dolmuş. Yeni bir anahtar oluşturun.",
  META_PERMISSION_DENIED: "Anahtarın bu reklam hesabını okuma izni yok. ads_read izni verildiğinden emin olun.",
  META_ACCOUNT_NOT_FOUND: "Reklam hesabı bulunamadı. Hesap kimliğini kontrol edin.",
  INVALID_AD_ACCOUNT: "Reklam hesabı kimliği sadece rakamlardan oluşmalı (act_ öneki isteğe bağlı).",
  INVALID_INPUT: "Alanları kontrol edin.",
  META_TIMEOUT: "Meta zamanında yanıt vermedi, tekrar deneyin.",
  OPENAI_NOT_CONFIGURED: "Yapay zekâ servisi yapılandırılmamış (OPENAI_API_KEY eksik)."
};

const money = (value: number | null) => value === null ? "—" : value.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

export function MyMetaClient() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [filter, setFilter] = useState<AccountAdVerdict | "ALL">("ALL");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/meta-account/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          adAccountId: String(form.get("adAccountId") || ""),
          accessToken: String(form.get("accessToken") || ""),
          datePreset: String(form.get("datePreset") || "last_30d"),
          withAi: form.get("withAi") === "on",
          niche: String(form.get("niche") || "").trim() || undefined
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "META_REQUEST_FAILED");
      setResult(data.data);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "META_REQUEST_FAILED";
      setError(ERRORS[code] || `İstek başarısız: ${code}`);
    } finally { setBusy(false); }
  }

  const counts = { TUTUYOR: 0, IZLE: 0, TUTMUYOR: 0, VERI_AZ: 0 } as Record<AccountAdVerdict, number>;
  for (const ad of result?.ads || []) counts[ad.verdict] += 1;
  const visible = (result?.ads || []).filter((ad) => filter === "ALL" || ad.verdict === filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black">Meta Hesabım</h1>
        <p className="mt-1 max-w-3xl text-slate-500">Kendi Meta reklam hesabınızı bağlayın: hangi reklamınız tutuyor, hangisi bütçe yakıyor görün. Yapay zekâ, sonuçlarınızı rakiplerin kazanan reklamlarıyla karşılaştırıp ne yapmanız gerektiğini söylesin.</p>
      </div>

      <Card className="mb-5">
        <form onSubmit={submit} className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Reklam hesabı kimliği
            <input name="adAccountId" required placeholder="act_1234567890" className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-semibold text-slate-700">Erişim anahtarı (access token)
            <input name="accessToken" required type="password" autoComplete="off" placeholder="EAAG..." className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" />
          </label>
          <label className="text-sm font-semibold text-slate-700">Dönem
            <select name="datePreset" defaultValue="last_30d" className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal">
              <option value="last_7d">Son 7 gün</option><option value="last_14d">Son 14 gün</option><option value="last_30d">Son 30 gün</option><option value="last_90d">Son 90 gün</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">Sektör / anahtar kelime (rakip karşılaştırması için)
            <input name="niche" placeholder="ör. halı yıkama" className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 font-normal" />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input name="withAi" type="checkbox" defaultChecked className="h-4 w-4" /> Yapay zekâ ile yorumla ve rakiplerle karşılaştır</label>
          <button disabled={busy} className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? "Reklamlar çekiliyor..." : "Reklamlarımı analiz et"}</button>
        </form>
        {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
        <details className="mt-4 text-sm text-slate-600">
          <summary className="cursor-pointer font-bold text-slate-800">Erişim anahtarını nereden alırım?</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>business.facebook.com → Ayarlar → Kullanıcılar → <b>Sistem kullanıcıları</b> bölümünden bir sistem kullanıcısı ekleyin.</li>
            <li>Bu kullanıcıya reklam hesabınızı <b>"Reklam hesabını görüntüle"</b> yetkisiyle atayın.</li>
            <li><b>Belirteç oluştur</b> deyin, bir uygulama seçin ve <b>ads_read</b> iznini işaretleyin. Çıkan anahtarı buraya yapıştırın.</li>
            <li>Reklam hesabı kimliği, Reklam Yöneticisi'nde sol üstteki hesap menüsünde yazan numaradır.</li>
          </ol>
          <p className="mt-2 text-xs text-slate-500">Anahtarınız sunucumuzda saklanmaz; yalnızca bu analiz için Meta'ya iletilir ve sadece okuma izni yeterlidir.</p>
        </details>
      </Card>

      {result && (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-4">
            {(Object.keys(counts) as AccountAdVerdict[]).map((verdict) => (
              <button key={verdict} type="button" onClick={() => setFilter(filter === verdict ? "ALL" : verdict)} className={`rounded-3xl border bg-white p-5 text-left shadow-soft ${filter === verdict ? "border-violet-400" : "border-slate-200"}`}>
                <div className="text-sm text-slate-500">{VERDICT_LABELS[verdict]}</div>
                <div className="mt-1 text-3xl font-black">{counts[verdict]}</div>
              </button>
            ))}
          </div>

          {result.ai && (
            <Card className="mb-5 border-violet-200">
              <div className="text-xs font-black uppercase tracking-wide text-violet-700">Yapay zekâ yorumu</div>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-800">{result.ai.summary}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {result.ai.insights.map((insight) => (
                  <div key={insight.title} className="rounded-2xl bg-violet-50/60 p-3 text-sm">
                    <div className="font-black text-violet-900">{insight.title}</div>
                    <p className="mt-1 text-slate-700">{insight.action}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {result.aiError && <p className="mb-5 text-sm font-semibold text-amber-700">Yapay zekâ yorumu alınamadı: {ERRORS[result.aiError] || result.aiError}</p>}

          {result.ads.length === 0 ? <Card><p className="text-sm text-slate-600">Bu dönemde hesapta gösterim alan reklam bulunamadı.</p></Card> : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Reklam</th><th className="px-4 py-3">Karar</th><th className="px-4 py-3">Harcama</th><th className="px-4 py-3">Gösterim</th><th className="px-4 py-3">CTR</th><th className="px-4 py-3">Dönüşüm</th><th className="px-4 py-3">CPA</th><th className="px-4 py-3">ROAS</th><th className="px-4 py-3">Neden</th></tr>
                </thead>
                <tbody>
                  {visible.map((ad) => (
                    <tr key={ad.adId} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3"><div className="font-bold">{ad.adName}</div><div className="text-xs text-slate-500">{ad.campaignName}</div></td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-black ${VERDICT_STYLES[ad.verdict]}`}>{VERDICT_LABELS[ad.verdict]}</span></td>
                      <td className="px-4 py-3">{money(ad.spend)}</td>
                      <td className="px-4 py-3">{ad.impressions.toLocaleString("tr-TR")}</td>
                      <td className="px-4 py-3">%{ad.ctr.toFixed(2)}</td>
                      <td className="px-4 py-3">{ad.conversions}</td>
                      <td className="px-4 py-3">{money(ad.cpa)}</td>
                      <td className="px-4 py-3">{ad.roas === null ? "—" : ad.roas.toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{ad.reasons.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
