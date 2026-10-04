// Kazanan Reklam Skoru: Meta Ad Library performans verisi (satış, CPA) paylaşmaz.
// Bu modül herkese açık üç sinyali birleştirir: reklam ne kadar süredir yayında,
// hâlâ aktif mi, kaç varyasyonu var ve kaç platformda gösteriliyor. Uzun süre açık
// kalan ve çok varyasyonu olan reklam, reklamverene para kazandırıyor demektir.

import { normalizeAdSearchText } from "@/lib/ad-search";

export type WinnerSignalAd = {
  id: string;
  brandPageId: string | null;
  status: string;
  daysRunning: number | null;
  headline: string | null;
  primaryText: string | null;
  landingUrl: string | null;
  raw?: unknown;
};

export type WinnerTier = "KAZANAN" | "POTANSIYEL" | "TEST";

export type WinnerScore = {
  score: number;
  tier: WinnerTier;
  variantCount: number;
  platforms: string[];
  reasons: string[];
};

export const WINNER_TIER_LABELS: Record<WinnerTier, string> = {
  KAZANAN: "Kazanan",
  POTANSIYEL: "Potansiyel",
  TEST: "Test aşamasında"
};

function rawRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
}

export function adPlatforms(raw: unknown): string[] {
  const record = rawRecord(raw);
  for (const key of ["publisherPlatforms", "publisher_platforms", "publisherPlatform", "platforms"]) {
    const value = record[key];
    if (Array.isArray(value)) {
      return [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0).map((item) => item.toUpperCase()))];
    }
  }
  return [];
}

function collationCount(raw: unknown) {
  const record = rawRecord(raw);
  for (const key of ["collationCount", "collation_count"]) {
    const value = Number(record[key]);
    if (Number.isFinite(value) && value > 0) return Math.round(value);
  }
  return 0;
}

// Aynı markanın aynı mesajı (başlık ya da metnin başı) kullanan reklamları tek bir
// "kreatif ailesi" sayılır; ailenin büyüklüğü varyasyon sayısıdır.
export function variantKey(ad: Pick<WinnerSignalAd, "brandPageId" | "headline" | "primaryText">) {
  const message = normalizeAdSearchText(ad.headline) || normalizeAdSearchText(ad.primaryText).slice(0, 60);
  if (!ad.brandPageId || !message) return null;
  return `${ad.brandPageId}|${message}`;
}

export function variantCounts(ads: WinnerSignalAd[]) {
  const counts = new Map<string, number>();
  for (const ad of ads) {
    const key = variantKey(ad);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

export function scoreWinner(ad: WinnerSignalAd, familySize = 1): WinnerScore {
  const days = Math.max(0, ad.daysRunning || 0);
  const active = ad.status === "ACTIVE";
  const variantCount = Math.max(1, familySize, collationCount(ad.raw));
  const platforms = adPlatforms(ad.raw);
  const reasons: string[] = [];

  const durationPoints = Math.min(days / 90, 1) * 40;
  const activePoints = active ? 20 : 0;
  const variantPoints = Math.min((variantCount - 1) / 5, 1) * 25;
  const platformPoints = Math.min(platforms.length / 4, 1) * 15;
  const score = Math.round(durationPoints + activePoints + variantPoints + platformPoints);

  if (days >= 60) reasons.push(`${days} gündür yayında; reklamveren uzun süre para harcamaya devam ediyor`);
  else if (days >= 21) reasons.push(`${days} gündür yayında; ilk test dönemini geçmiş`);
  else if (days > 0) reasons.push(`Sadece ${days} gündür yayında; henüz test aşamasında olabilir`);
  if (active) reasons.push("Hâlâ aktif");
  else reasons.push("Yayından kaldırılmış; tutmamış olabilir");
  if (variantCount >= 3) reasons.push(`${variantCount} varyasyonu var; reklamveren bu mesajı çoğaltıyor`);
  if (platforms.length >= 2) reasons.push(`${platforms.length} platformda gösteriliyor (${platforms.join(", ")})`);

  const tier: WinnerTier = score >= 70 ? "KAZANAN" : score >= 45 ? "POTANSIYEL" : "TEST";
  return { score, tier, variantCount, platforms, reasons };
}

export function rankWinners<T extends WinnerSignalAd>(ads: T[]) {
  const counts = variantCounts(ads);
  return ads
    .map((ad) => {
      const key = variantKey(ad);
      return { ad, winner: scoreWinner(ad, key ? counts.get(key) || 1 : 1) };
    })
    .sort((left, right) => right.winner.score - left.winner.score || (right.ad.daysRunning || 0) - (left.ad.daysRunning || 0));
}
