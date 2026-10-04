// Reklamı Durmuş Reklamverenler: Daha önce Meta'da reklam verip şu anda hiç aktif
// reklamı olmayan markaları bulur. Bu markalar reklam/kreatif hizmeti için sıcak
// potansiyel müşterilerdir: reklam vermeyi denemişler, bütçeleri var ama bir şey tutmamış.

export type StoppedSignalAd = {
  brandPageId: string | null;
  brandName: string | null;
  brandLogoUrl: string | null;
  brandPageUrl: string | null;
  brandWebsite: string | null;
  status: string;
  daysRunning: number | null;
  firstSeenAt: Date | null;
  lastSeenAt: Date | null;
  landingUrl: string | null;
  headline: string | null;
  countries: string[];
};

export type StoppedAdvertiser = {
  brandPageId: string;
  brandName: string;
  brandLogoUrl: string | null;
  brandPageUrl: string | null;
  website: string | null;
  totalAds: number;
  longestRunDays: number;
  lastAdEndedAt: Date | null;
  daysSinceStopped: number | null;
  countries: string[];
  sampleHeadline: string | null;
  leadScore: number;
};

export function landingHost(url: string | null) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    if (!host || /(^|\.)(facebook|fb|instagram|messenger|whatsapp|wa)\.(com|me)$/.test(host) || host === "l.facebook.com") return null;
    return host;
  } catch {
    return null;
  }
}

function adEndDate(ad: StoppedSignalAd) {
  if (ad.lastSeenAt) return ad.lastSeenAt;
  if (ad.firstSeenAt && ad.daysRunning) return new Date(ad.firstSeenAt.getTime() + ad.daysRunning * 86_400_000);
  return null;
}

export function findStoppedAdvertisers(ads: StoppedSignalAd[], now = new Date()): StoppedAdvertiser[] {
  const groups = new Map<string, StoppedSignalAd[]>();
  for (const ad of ads) {
    if (!ad.brandPageId) continue;
    const list = groups.get(ad.brandPageId) || [];
    list.push(ad);
    groups.set(ad.brandPageId, list);
  }

  const results: StoppedAdvertiser[] = [];
  for (const [brandPageId, list] of groups) {
    if (list.some((ad) => ad.status === "ACTIVE")) continue;
    if (!list.some((ad) => ad.status === "INACTIVE")) continue;

    const endDates = list.map(adEndDate).filter((date): date is Date => Boolean(date));
    const lastAdEndedAt = endDates.length ? new Date(Math.max(...endDates.map((date) => date.getTime()))) : null;
    const daysSinceStopped = lastAdEndedAt ? Math.max(0, Math.floor((now.getTime() - lastAdEndedAt.getTime()) / 86_400_000)) : null;
    const longestRunDays = Math.max(0, ...list.map((ad) => ad.daysRunning || 0));
    const hostCounts = new Map<string, number>();
    for (const ad of list) {
      const host = landingHost(ad.landingUrl);
      if (host) hostCounts.set(host, (hostCounts.get(host) || 0) + 1);
    }
    const topHost = [...hostCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || null;
    const first = list[0]!;

    // Çok reklam vermiş (bütçesi var), yakın zamanda durmuş ve web sitesi olan marka
    // en sıcak müşteridir.
    const volume = Math.min(list.length / 10, 1) * 45;
    const recency = daysSinceStopped === null ? 10 : daysSinceStopped <= 30 ? 30 : daysSinceStopped <= 90 ? 20 : daysSinceStopped <= 180 ? 10 : 0;
    const reachable = (first.brandWebsite || topHost) ? 15 : 0;
    const experience = longestRunDays >= 30 ? 10 : longestRunDays >= 7 ? 5 : 0;

    results.push({
      brandPageId,
      brandName: first.brandName || "Bilinmeyen marka",
      brandLogoUrl: first.brandLogoUrl,
      brandPageUrl: first.brandPageUrl,
      website: first.brandWebsite || topHost,
      totalAds: list.length,
      longestRunDays,
      lastAdEndedAt,
      daysSinceStopped,
      countries: [...new Set(list.flatMap((ad) => ad.countries))].slice(0, 6),
      sampleHeadline: list.find((ad) => ad.headline)?.headline || null,
      leadScore: Math.round(volume + recency + reachable + experience)
    });
  }

  return results.sort((left, right) => right.leadScore - left.leadScore || right.totalAds - left.totalAds);
}

export function outreachMessage(advertiser: Pick<StoppedAdvertiser, "brandName" | "totalAds" | "daysSinceStopped">) {
  const when = advertiser.daysSinceStopped === null ? "bir süre önce" : advertiser.daysSinceStopped <= 30 ? "birkaç hafta önce" : `${Math.round(advertiser.daysSinceStopped / 30)} ay kadar önce`;
  return [
    `Merhaba ${advertiser.brandName} ekibi,`,
    "",
    `Meta reklam kütüphanesinde ${advertiser.totalAds} reklamınızı gördük, ancak ${when} reklamlarınızı durdurmuşsunuz.`,
    "Reklamları kendi ekibiniz mi hazırlıyordu, yoksa bir ajansla mı çalışıyordunuz?",
    "",
    "Sektörünüzde şu anda uzun süredir yayında kalan (yani para kazandıran) reklamları analiz ettik.",
    "İsterseniz bu kazanan kalıplara göre sizin için hazırlayacağımız ilk kreatif setini ücretsiz gösterelim.",
    "",
    "Kısa bir görüşmeye ne dersiniz?"
  ].join("\n");
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function stoppedAdvertisersCsv(rows: StoppedAdvertiser[]) {
  const header = ["Marka", "Web sitesi", "Facebook sayfası", "Toplam reklam", "En uzun yayın (gün)", "Son reklam bitişi", "Durmuş (gün)", "Ülkeler", "Müşteri skoru"];
  const lines = rows.map((row) => [row.brandName, row.website, row.brandPageUrl, row.totalAds, row.longestRunDays, row.lastAdEndedAt, row.daysSinceStopped, row.countries.join(" "), row.leadScore].map(csvCell).join(","));
  return [header.join(","), ...lines].join("\n");
}
