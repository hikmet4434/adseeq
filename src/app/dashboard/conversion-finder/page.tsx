import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { planFromUser } from "@/lib/plans";
import { Card } from "@/components/ui/card";
import { AD_COUNTRIES, AD_COUNTRY_CODES } from "@/lib/countries";
import { COST_BAND_LABELS, TR_MARKET_SCAN_TERMS } from "@/lib/conversion-finder";
import { loadConversionRanking, maskRankingForPlan } from "@/lib/conversion-finder-data";
import { ConversionScanPanel } from "@/components/conversion-finder/scan-panel";

const BAND_STYLES = { COK_DUSUK: "bg-emerald-100 text-emerald-800", DUSUK: "bg-lime-100 text-lime-800", ORTA: "bg-amber-100 text-amber-800", YUKSEK: "bg-rose-100 text-rose-800" } as const;
const MEDIA_LABELS: Record<string, string> = { VIDEO: "Video", IMAGE: "Görsel", CAROUSEL: "Karusel", UNKNOWN: "—" };
const formatTry = (value: number) => `₺${value.toLocaleString("tr-TR", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 })}`;

export default async function ConversionFinderPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const plan = planFromUser(user as never);
  const isAdmin = user.role === "ADMIN";
  const params = await searchParams;
  const requested = params.country?.toUpperCase();
  const country = requested && AD_COUNTRY_CODES.has(requested) && requested !== "ALL" ? requested : "TR";
  const countryLabel = AD_COUNTRIES.find(([code]) => code === country)?.[1] || country;
  const ranking = await loadConversionRanking(country, 100);
  const rows = maskRankingForPlan(ranking.results, plan?.code, isAdmin);
  const canScan = isAdmin || Boolean(plan?.code && plan.code !== "FREE");

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Dönüşüm Maliyeti Bulucu</h1>
          <p className="mt-1 max-w-3xl text-slate-500">{countryLabel} pazarında Facebook'ta dönüşüm maliyeti en düşük olması beklenen 100 ürün. Meta, reklam başına dönüşüm maliyetini paylaşmaz; endeks yayın süresi, kreatif sayısı, fiyat noktası, teklif ve medya türü sinyallerinden türetilen bir tahmindir.</p>
        </div>
        <form className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm">
          <select name="country" defaultValue={country} aria-label="Ülke" className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            {AD_COUNTRIES.filter(([code]) => code !== "ALL").map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
          <button className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Uygula</button>
        </form>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card><div className="text-sm text-slate-500">{countryLabel} reklamı</div><div className="mt-1 text-3xl font-black">{ranking.adCount}</div></Card>
        <Card><div className="text-sm text-slate-500">Sıralanan ürün</div><div className="mt-1 text-3xl font-black text-violet-700">{ranking.productCount}</div></Card>
        <Card><div className="text-sm text-slate-500">Çok düşük maliyet bandı</div><div className="mt-1 text-3xl font-black text-emerald-600">{ranking.results.filter((item) => item.band === "COK_DUSUK").length}</div></Card>
      </div>

      <div className="mb-5"><ConversionScanPanel country={country} defaultTerms={TR_MARKET_SCAN_TERMS} canScan={canScan} /></div>

      {rows.length === 0 && <Card><p className="text-sm text-slate-600">Bu ülke için henüz reklam verisi yok. Yukarıdaki canlı taramayı çalıştırın veya Ads sayfasından {countryLabel} araması yapın.</p></Card>}

      {rows.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th><th className="px-4 py-3">Ürün</th><th className="px-4 py-3">Marka</th><th className="px-4 py-3">Fiyat</th>
                <th className="px-4 py-3">Yayın</th><th className="px-4 py-3">Kreatif</th><th className="px-4 py-3">Medya</th><th className="px-4 py-3">Maliyet endeksi</th><th className="px-4 py-3">Tahmini CPA</th><th className="px-4 py-3">Bağlantı</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => (
                <tr key={item.key} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3 font-black text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      {item.thumbnailUrl ? <img src={item.thumbnailUrl} alt="" className="h-12 w-12 flex-none rounded-xl object-cover" /> : <div className="h-12 w-12 flex-none rounded-xl bg-slate-100" />}
                      <div className={item.isLocked ? "locked-blur" : ""}>
                        <div className="font-black">{item.productName}</div>
                        {item.offers.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{item.offers.map((offer) => <span key={offer} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{offer}</span>)}</div>}
                        {!item.isLocked && item.reasons.length > 0 && <div className="mt-1 text-xs text-slate-500">{item.reasons.slice(0, 2).join(" · ")}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{item.brandName || "—"}</td>
                  <td className="px-4 py-3 font-bold">{item.priceTry !== null ? formatTry(item.priceTry) : "—"}</td>
                  <td className="px-4 py-3">{item.maxDaysRunning ? `${item.maxDaysRunning} gün` : "—"}<div className="text-xs text-slate-500">{item.activeAdCount} aktif</div></td>
                  <td className="px-4 py-3 font-bold">{item.adCount}</td>
                  <td className="px-4 py-3">{MEDIA_LABELS[item.dominantMedia] || item.dominantMedia}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2"><span className="text-lg font-black">{item.costIndex}</span><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${BAND_STYLES[item.band]}`}>{COST_BAND_LABELS[item.band]}</span></div>
                    <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-600" style={{ width: `${Math.max(4, 100 - item.costIndex)}%` }} /></div>
                    <div className="mt-1 text-xs text-slate-500">Güven %{Math.round(item.confidence * 100)}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{item.isLocked ? <Link href="/pricing" className="text-violet-700">Kilidi aç</Link> : item.estimatedCpaTry ? `${formatTry(item.estimatedCpaTry.min)}–${formatTry(item.estimatedCpaTry.max)}` : "—"}</td>
                  <td className="px-4 py-3 text-xs font-semibold">
                    {item.isLocked ? <Link href="/pricing" className="text-violet-700">Upgrade</Link> : (
                      <div className="flex flex-col gap-1">
                        {item.landingUrl && <a href={item.landingUrl} target="_blank" rel="noopener noreferrer" className="text-violet-700 hover:underline">{item.landingHost || "Mağaza"}</a>}
                        {item.adLibraryUrl && <a href={item.adLibraryUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:underline">Ad Library</a>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <p className="mt-4 text-xs text-slate-500">Endeks 0–100 arasındadır; düşük değer daha ucuz dönüşüm beklentisi anlamına gelir. Tahmini CPA, tespit edilen fiyat noktası üzerinden kaba bir aralıktır ve gerçek hesap verisi yerine geçmez.</p>
    </div>
  );
}
