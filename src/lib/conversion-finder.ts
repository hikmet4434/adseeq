// Dönüşüm Maliyeti Bulucu: Meta Ad Library dönüşüm maliyetini (CPA) yayınlamaz.
// Bu modül, herkese açık sinyallerden (yayın süresi, kreatif sayısı, fiyat, teklif,
// medya türü, aktiflik) ürün bazlı "Dönüşüm Maliyeti Endeksi" türetir. Endeks düşük
// olan ürünlerin dönüşüm maliyetinin düşük olması beklenir; bu bir tahmindir, ölçüm değildir.

export type ConversionSignalAd = {
  id: string;
  headline: string | null;
  primaryText: string | null;
  description: string | null;
  landingUrl: string | null;
  productUrl: string | null;
  mediaType: string;
  status: string;
  daysRunning: number | null;
  firstSeenAt: Date | null;
  brandPageId: string | null;
  brandName: string | null;
  brandLogoUrl: string | null;
  thumbnailUrl: string | null;
};

export type CostBand = "COK_DUSUK" | "DUSUK" | "ORTA" | "YUKSEK";

export type ProductConversionResult = {
  key: string;
  productName: string;
  brandName: string | null;
  brandLogoUrl: string | null;
  landingUrl: string | null;
  landingHost: string | null;
  adLibraryUrl: string | null;
  thumbnailUrl: string | null;
  adCount: number;
  activeAdCount: number;
  maxDaysRunning: number;
  dominantMedia: string;
  priceTry: number | null;
  offers: string[];
  costIndex: number;
  band: CostBand;
  confidence: number;
  estimatedCpaTry: { min: number; max: number } | null;
  reasons: string[];
  sampleAdIds: string[];
};

export const COST_BAND_LABELS: Record<CostBand, string> = {
  COK_DUSUK: "Çok düşük",
  DUSUK: "Düşük",
  ORTA: "Orta",
  YUKSEK: "Yüksek"
};

const OFFER_RULES: Array<[RegExp, string]> = [
  [/(ucretsiz|bedava)\s+kargo|kargo\s+(ucretsiz|bedava)/, "Ücretsiz kargo"],
  [/kapida\s+odeme/, "Kapıda ödeme"],
  [/%\s?\d{1,2}|indirim|firsat|kampanya/, "İndirim"],
  [/taksit/, "Taksit"],
  [/iade\s+garantisi|kosulsuz\s+iade|para\s+iade/, "İade garantisi"],
  [/sinirli\s+(stok|sure|sayi)|son\s+(gun|firsat)|tukenmeden|stoklar/, "Aciliyet"],
  [/\d\s*al\s*\d\s*ode|\d\s*alana\s*\d|(ikinci|2\.)\s*urun/, "Çoklu paket"],
  [/sadece\s+bugun|bugune\s+ozel|haftaya\s+ozel/, "Günlük teklif"]
];

export function plainText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTurkishNumber(raw: string) {
  const cleaned = raw.replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(cleaned)) return Number(cleaned.replace(/\./g, "").replace(",", "."));
  if (/^\d+,\d+$/.test(cleaned)) return Number(cleaned.replace(",", "."));
  if (/^\d+(\.\d+)?$/.test(cleaned)) return Number(cleaned);
  return NaN;
}

// Reklam metnindeki en düşük makul TL fiyatını döndürür (indirimli fiyat genellikle en düşük olandır).
export function extractPriceTry(...texts: Array<string | null | undefined>) {
  const combined = texts.filter(Boolean).join(" \n ");
  const pattern = /(?:₺|tl\s?)\s?(\d[\d.]*(?:,\d{1,2})?)|(\d[\d.]*(?:,\d{1,2})?)\s?(?:₺|tl\b|lira\b)/giu;
  const prices: number[] = [];
  for (const match of combined.matchAll(pattern)) {
    const value = parseTurkishNumber(match[1] || match[2] || "");
    if (Number.isFinite(value) && value >= 10 && value <= 250_000) prices.push(value);
  }
  return prices.length ? Math.min(...prices) : null;
}

export function detectOffers(...texts: Array<string | null | undefined>) {
  const text = plainText(texts.filter(Boolean).join(" "));
  if (!text) return [];
  return OFFER_RULES.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
}

export function normalizeLandingUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    let url = new URL(value.trim());
    const redirected = url.searchParams.get("u");
    if (/(^|\.)facebook\.com$/i.test(url.hostname) && redirected) url = new URL(redirected);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "").toLowerCase();
    return { host, path, canonical: `https://${host}${path}` };
  } catch {
    return null;
  }
}

function humanizePathSegment(path: string) {
  const segment = path.split("/").filter(Boolean).pop() || "";
  return segment.replace(/[-_]+/g, " ").replace(/\.[a-z]+$/, "").trim();
}

export function productKey(ad: ConversionSignalAd) {
  const landing = normalizeLandingUrl(ad.landingUrl);
  if (landing && landing.path && landing.path !== "/") return `url:${landing.host}${landing.path}`;
  const title = plainText(ad.headline);
  if (title) return `title:${ad.brandPageId || plainText(ad.brandName) || "?"}|${title}`;
  if (landing) return `host:${landing.host}|${ad.brandPageId || ""}`;
  return `ad:${ad.id}`;
}

export function productNameFor(ad: ConversionSignalAd) {
  if (ad.headline?.trim()) return ad.headline.trim().slice(0, 90);
  const firstLine = (ad.primaryText || "").split(/\n|[.!?]\s/).map((line) => line.trim()).find((line) => line.length >= 8);
  if (firstLine) return firstLine.slice(0, 90);
  const landing = normalizeLandingUrl(ad.landingUrl);
  const fromPath = landing ? humanizePathSegment(landing.path) : "";
  return fromPath || ad.brandName || "Ürün";
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const logRatio = (value: number, saturation: number) => clamp01(Math.log1p(Math.max(0, value)) / Math.log1p(saturation));
const MEDIA_CHEAPNESS: Record<string, number> = { VIDEO: 1, CAROUSEL: 0.7, IMAGE: 0.6, UNKNOWN: 0.45 };

export function scoreProduct(ads: ConversionSignalAd[]): ProductConversionResult {
  const primary = [...ads].sort((a, b) => (b.daysRunning || 0) - (a.daysRunning || 0))[0];
  const activeAds = ads.filter((ad) => ad.status === "ACTIVE");
  const maxDays = Math.max(0, ...ads.map((ad) => ad.daysRunning || 0));
  const priceTry = extractPriceTry(...ads.flatMap((ad) => [ad.headline, ad.primaryText, ad.description]));
  const offers = [...new Set(ads.flatMap((ad) => detectOffers(ad.headline, ad.primaryText, ad.description)))];
  const mediaCounts = new Map<string, number>();
  for (const ad of ads) mediaCounts.set(ad.mediaType, (mediaCounts.get(ad.mediaType) || 0) + 1);
  const dominantMedia = [...mediaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "UNKNOWN";

  const longevity = logRatio(maxDays, 120);
  const scale = logRatio(ads.length - 1, 20);
  const activity = ads.length ? clamp01(activeAds.length / ads.length) * 0.7 + (activeAds.length ? 0.3 : 0) : 0;
  const price = priceTry === null ? 0.5 : 1 - clamp01((Math.log(priceTry) - Math.log(100)) / (Math.log(5000) - Math.log(100)));
  const offer = clamp01(offers.length / 3);
  const media = MEDIA_CHEAPNESS[dominantMedia] ?? 0.45;
  const cheapness = longevity * 0.35 + scale * 0.2 + activity * 0.1 + price * 0.15 + offer * 0.1 + media * 0.1;
  const costIndex = Math.round((1 - cheapness) * 100);
  const band: CostBand = costIndex < 30 ? "COK_DUSUK" : costIndex < 45 ? "DUSUK" : costIndex < 60 ? "ORTA" : "YUKSEK";
  const confidence = Math.round(clamp01(0.25 + (maxDays > 0 ? 0.3 : 0) + (priceTry !== null ? 0.2 : 0) + (ads.length > 1 ? 0.15 : 0) + (activeAds.length ? 0.1 : 0)) * 100) / 100;
  const cpaRatioMin = 0.12 + (1 - cheapness) * 0.5;
  const cpaRatioMax = 0.2 + (1 - cheapness) * 0.7;
  const estimatedCpaTry = priceTry === null ? null : { min: Math.round(priceTry * cpaRatioMin), max: Math.round(priceTry * cpaRatioMax) };

  const reasons: string[] = [];
  if (maxDays >= 30) reasons.push(`${maxDays} gündür yayında; uzun yayın kârlı dönüşüm sinyalidir`);
  else if (maxDays > 0) reasons.push(`${maxDays} gündür yayında`);
  if (ads.length > 1) reasons.push(`${ads.length} kreatif ile ölçekleniyor`);
  if (activeAds.length) reasons.push(`${activeAds.length} reklam şu an aktif`);
  if (priceTry !== null && priceTry <= 1000) reasons.push(`₺${priceTry.toLocaleString("tr-TR")} fiyat noktası dönüşümü kolaylaştırır`);
  if (offers.length) reasons.push(`Teklif sinyalleri: ${offers.join(", ")}`);
  if (dominantMedia === "VIDEO") reasons.push("Video kreatif Türkiye'de daha düşük CPA eğilimi gösterir");

  const landing = normalizeLandingUrl(primary.landingUrl);
  return {
    key: productKey(primary),
    productName: productNameFor(primary),
    brandName: primary.brandName,
    brandLogoUrl: primary.brandLogoUrl,
    landingUrl: landing?.canonical || primary.landingUrl,
    landingHost: landing?.host || null,
    adLibraryUrl: primary.productUrl,
    thumbnailUrl: ads.map((ad) => ad.thumbnailUrl).find(Boolean) || null,
    adCount: ads.length,
    activeAdCount: activeAds.length,
    maxDaysRunning: maxDays,
    dominantMedia,
    priceTry,
    offers,
    costIndex,
    band,
    confidence,
    estimatedCpaTry,
    reasons,
    sampleAdIds: ads.slice(0, 5).map((ad) => ad.id)
  };
}

export function rankProductsByConversionCost(ads: ConversionSignalAd[], limit = 100) {
  const groups = new Map<string, ConversionSignalAd[]>();
  for (const ad of ads) {
    const key = productKey(ad);
    groups.set(key, [...(groups.get(key) || []), ad]);
  }
  return [...groups.values()]
    .map(scoreProduct)
    .sort((a, b) => a.costIndex - b.costIndex || b.confidence - a.confidence || b.maxDaysRunning - a.maxDaysRunning || b.adCount - a.adCount)
    .slice(0, limit);
}

// Türkiye pazarını genel e-ticaret niyetiyle tarayan anahtar kelimeler.
export const TR_MARKET_SCAN_TERMS = [
  "kapıda ödeme", "ücretsiz kargo", "sipariş ver", "hemen al", "indirim fırsatı",
  "sınırlı stok", "son gün", "1 alana 1 bedava", "yeni ürün", "iade garantisi"
] as const;
