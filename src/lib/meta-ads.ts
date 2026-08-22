import { AdSearchMatchMode, filterRelevantAds } from "@/lib/ad-search";

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION?.trim() || "v23.0";
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

type MetaArchiveAd = {
  id?: string;
  page_id?: string;
  page_name?: string;
  ad_creation_time?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_descriptions?: string[];
  languages?: string[];
  publisher_platforms?: string[];
};

type MetaArchiveResponse = {
  data?: MetaArchiveAd[];
  paging?: { next?: string };
  error?: { code?: number; message?: string; type?: string };
};

export type MetaAdsInput = {
  searchTerm: string;
  country: string;
  adActiveStatus: "ACTIVE" | "INACTIVE" | "ALL";
  matchMode: AdSearchMatchMode;
  maxResults: number;
};

function accessToken() {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("META_NOT_CONFIGURED");
  return token;
}

function safeErrorCode(status: number, payload: MetaArchiveResponse) {
  const apiCode = payload.error?.code;
  return apiCode ? `META_API_${apiCode}` : `META_HTTP_${status}`;
}

function toIngestRecord(ad: MetaArchiveAd, country: string, requestedStatus: MetaAdsInput["adActiveStatus"]): Record<string, unknown> | null {
  if (!ad.id) return null;
  return {
    adArchiveID: ad.id,
    pageID: ad.page_id,
    pageName: ad.page_name,
    adText: ad.ad_creative_bodies?.[0],
    headline: ad.ad_creative_link_titles?.[0],
    description: ad.ad_creative_link_descriptions?.[0],
    adStatus: requestedStatus === "ALL" ? (ad.ad_delivery_stop_time ? "INACTIVE" : "ACTIVE") : requestedStatus,
    countries: country === "ALL" ? [] : [country],
    startDate: ad.ad_delivery_start_time,
    endDate: ad.ad_delivery_stop_time,
    adCreationTime: ad.ad_creation_time,
    language: ad.languages?.[0],
    publisherPlatforms: ad.publisher_platforms,
    // ad_snapshot_url access_token içerir. Sadece herkese açık Ad Library adresi saklanır.
    adLibraryURL: `https://www.facebook.com/ads/library/?id=${encodeURIComponent(ad.id)}`
  };
}

export async function searchMetaAds(input: MetaAdsInput) {
  const token = accessToken();
  const candidateLimit = Math.min(Math.max(input.maxResults * 3, 25), 300);
  const params = new URLSearchParams({
    search_terms: input.searchTerm,
    search_type: input.matchMode === "EXACT_PHRASE" ? "KEYWORD_EXACT_PHRASE" : "KEYWORD_UNORDERED",
    ad_reached_countries: JSON.stringify([input.country]),
    ad_active_status: input.adActiveStatus,
    ad_type: "ALL",
    fields: [
      "id", "page_id", "page_name", "ad_creation_time", "ad_delivery_start_time", "ad_delivery_stop_time",
      "ad_creative_bodies", "ad_creative_link_titles", "ad_creative_link_descriptions", "languages", "publisher_platforms"
    ].join(","),
    limit: String(Math.min(candidateLimit, 100)),
    access_token: token
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const records: MetaArchiveAd[] = [];
  let nextUrl: string | undefined = `${META_GRAPH_BASE}/ads_archive?${params}`;

  try {
    while (nextUrl && records.length < candidateLimit) {
      const response = await fetch(nextUrl, { cache: "no-store", signal: controller.signal });
      const payload = await response.json().catch(() => ({})) as MetaArchiveResponse;
      if (!response.ok || payload.error) throw new Error(safeErrorCode(response.status, payload));
      records.push(...(payload.data || []));
      nextUrl = payload.paging?.next;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("META_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const normalized = records.flatMap((ad) => {
    const record = toIngestRecord(ad, input.country, input.adActiveStatus);
    return record ? [{
      record,
      primaryText: typeof record.adText === "string" ? record.adText : null,
      headline: typeof record.headline === "string" ? record.headline : null,
      description: typeof record.description === "string" ? record.description : null,
      brandName: typeof record.pageName === "string" ? record.pageName : null
    }] : [];
  });
  const relevant = filterRelevantAds(normalized, input.searchTerm, input.matchMode, input.maxResults).map((item) => item.record);
  return { received: records.length, relevant };
}
