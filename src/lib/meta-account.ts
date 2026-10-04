// Meta Hesabım: Kullanıcının kendi reklam hesabındaki reklamları Marketing API
// (Insights) üzerinden çeker ve hesap ortalamalarına göre "tutan / tutmayan"
// olarak sınıflandırır. Erişim anahtarı veritabanına yazılmaz; yalnızca o istek
// süresince kullanılır.

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v23.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export const META_DATE_PRESETS = ["last_7d", "last_14d", "last_30d", "last_90d"] as const;
export type MetaDatePreset = (typeof META_DATE_PRESETS)[number];

type ActionValue = { action_type?: string; value?: string };

export type MetaInsightRow = {
  ad_id?: string;
  ad_name?: string;
  campaign_name?: string;
  adset_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  actions?: ActionValue[];
  action_values?: ActionValue[];
};

export type AccountAdVerdict = "TUTUYOR" | "IZLE" | "TUTMUYOR" | "VERI_AZ";

export type AccountAdResult = {
  adId: string;
  adName: string;
  campaignName: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number | null;
  conversions: number;
  cpa: number | null;
  roas: number | null;
  verdict: AccountAdVerdict;
  reasons: string[];
};

export const VERDICT_LABELS: Record<AccountAdVerdict, string> = {
  TUTUYOR: "Tutuyor",
  IZLE: "İzle",
  TUTMUYOR: "Tutmuyor",
  VERI_AZ: "Veri az"
};

const CONVERSION_TYPES = [
  "purchase", "offsite_conversion.fb_pixel_purchase", "omni_purchase",
  "lead", "offsite_conversion.fb_pixel_lead", "onsite_conversion.lead_grouped",
  "complete_registration", "offsite_conversion.fb_pixel_complete_registration",
  "mobile_app_install", "app_install"
];

function num(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Aynı dönüşüm birden fazla action_type altında tekrar raporlanabildiği için toplamak
// yerine öncelik sırasındaki ilk eşleşen tür alınır.
function firstAction(list: ActionValue[] | undefined) {
  if (!list?.length) return 0;
  for (const type of CONVERSION_TYPES) {
    const match = list.find((item) => item.action_type === type);
    if (match) return num(match.value);
  }
  return 0;
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function normalizeAdAccountId(value: string) {
  const digits = value.trim().replace(/^act_/i, "");
  return /^\d{5,25}$/.test(digits) ? `act_${digits}` : null;
}

export function classifyAccountAds(rows: MetaInsightRow[]): AccountAdResult[] {
  const base = rows.filter((row) => row.ad_id).map((row) => {
    const spend = num(row.spend);
    const impressions = num(row.impressions);
    const clicks = num(row.clicks);
    const conversions = firstAction(row.actions);
    const revenue = firstAction(row.action_values);
    return {
      adId: row.ad_id!,
      adName: row.ad_name || row.ad_id!,
      campaignName: row.campaign_name || null,
      spend,
      impressions,
      clicks,
      ctr: row.ctr ? num(row.ctr) : impressions ? (clicks / impressions) * 100 : 0,
      cpc: clicks ? spend / clicks : null,
      conversions,
      cpa: conversions ? spend / conversions : null,
      roas: revenue && spend ? revenue / spend : null
    };
  });

  const measured = base.filter((ad) => ad.impressions >= 1000);
  const medianCtr = median(measured.map((ad) => ad.ctr));
  const medianCpa = median(measured.flatMap((ad) => ad.cpa === null ? [] : [ad.cpa]));

  return base.map((ad) => {
    const reasons: string[] = [];
    if (ad.impressions < 1000) return { ...ad, verdict: "VERI_AZ" as const, reasons: ["1.000 gösterimin altında; karar vermek için erken"] };

    let points = 0;
    if (ad.roas !== null) {
      if (ad.roas >= 2) { points += 2; reasons.push(`ROAS ${ad.roas.toFixed(2)}: harcamanın ${ad.roas.toFixed(1)} katı gelir`); }
      else if (ad.roas < 1) { points -= 2; reasons.push(`ROAS ${ad.roas.toFixed(2)}: harcamayı geri kazandırmıyor`); }
    }
    if (ad.cpa !== null && medianCpa !== null) {
      if (ad.cpa <= medianCpa * 0.8) { points += 1; reasons.push("Dönüşüm maliyeti hesap ortalamasından düşük"); }
      else if (ad.cpa >= medianCpa * 1.5) { points -= 1; reasons.push("Dönüşüm maliyeti hesap ortalamasının çok üstünde"); }
    }
    if (ad.conversions === 0 && medianCpa !== null && ad.spend >= medianCpa * 2) {
      points -= 2; reasons.push("Ortalama dönüşüm maliyetinin 2 katı harcadı ama hiç dönüşüm getirmedi");
    }
    if (medianCtr !== null && medianCtr > 0) {
      if (ad.ctr >= medianCtr * 1.3) { points += 1; reasons.push(`Tıklama oranı (%${ad.ctr.toFixed(2)}) hesap ortalamasının üstünde`); }
      else if (ad.ctr <= medianCtr * 0.6) { points -= 1; reasons.push(`Tıklama oranı (%${ad.ctr.toFixed(2)}) hesap ortalamasının çok altında`); }
    }
    if (!reasons.length) reasons.push("Hesap ortalamasına yakın performans");
    const verdict: AccountAdVerdict = points >= 2 ? "TUTUYOR" : points <= -2 ? "TUTMUYOR" : "IZLE";
    return { ...ad, verdict, reasons };
  }).sort((left, right) => right.spend - left.spend);
}

export async function fetchAccountInsights(adAccountId: string, accessToken: string, datePreset: MetaDatePreset) {
  const fields = ["ad_id", "ad_name", "campaign_name", "adset_name", "spend", "impressions", "clicks", "ctr", "cpc", "actions", "action_values"].join(",");
  const rows: MetaInsightRow[] = [];
  let url: string | null = `${META_GRAPH_BASE}/${adAccountId}/insights?${new URLSearchParams({ level: "ad", fields, date_preset: datePreset, limit: "200", access_token: accessToken })}`;
  let pages = 0;
  while (url && pages < 5) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response: Response = await fetch(url, { cache: "no-store", signal: controller.signal });
      const payload = await response.json().catch(() => ({})) as { data?: MetaInsightRow[]; paging?: { next?: string }; error?: { code?: number; message?: string } };
      if (!response.ok || payload.error) {
        const code = payload.error?.code;
        if (code === 190) throw new Error("META_TOKEN_INVALID");
        if (code === 10 || code === 200 || code === 272 || code === 275) throw new Error("META_PERMISSION_DENIED");
        if (code === 100) throw new Error("META_ACCOUNT_NOT_FOUND");
        throw new Error(`META_HTTP_${response.status}`);
      }
      rows.push(...(payload.data || []));
      url = payload.paging?.next || null;
      pages += 1;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw new Error("META_TIMEOUT");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  return rows;
}
