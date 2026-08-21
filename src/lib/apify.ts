import { AdSource, AdStatus, MediaType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const APIFY_API_BASE = "https://api.apify.com/v2";
const DEFAULT_ACTOR_ID = "aiscraperdev~facebook-meta-ads-library-scraper";

export type ApifyIngestInput = {
  searchTerms: string[];
  country: string;
  adActiveStatus: "ACTIVE" | "INACTIVE" | "ALL";
  mediaType: "ALL" | "IMAGE" | "VIDEO" | "MEME" | "NONE";
  maxResults: number;
  scrapeAdDetails: boolean;
  includeAboutPage: boolean;
  maxCostUsd: number;
};

type JsonRecord = Record<string, unknown>;

function stringValue(record: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Math.round(Number(value));
  if (value && typeof value === "object") {
    const object = value as JsonRecord;
    return numberValue(object.lower_bound ?? object.lowerBound ?? object.min);
  }
  return null;
}

function stringArray(record: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  return [];
}

function nestedRecords(record: JsonRecord) {
  const queue: unknown[] = [record];
  const records: JsonRecord[] = [];
  const seen = new Set<object>();

  while (queue.length && records.length < 500) {
    const value = queue.shift();
    if (!value || typeof value !== "object" || seen.has(value as object)) continue;
    seen.add(value as object);
    if (Array.isArray(value)) {
      queue.push(...value);
      continue;
    }

    const current = value as JsonRecord;
    records.push(current);
    queue.push(...Object.values(current));
  }

  return records;
}

function safeMediaUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function deepUrlValue(record: JsonRecord, ...keys: string[]) {
  const records = nestedRecords(record);
  for (const key of keys) {
    for (const current of records) {
      const value = current[key];
      const direct = safeMediaUrl(value);
      if (direct) return direct;
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        const nested = safeMediaUrl(item);
        if (nested) return nested;
      }
    }
  }
  return null;
}

function dateValue(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstMediaUrl(record: JsonRecord) {
  return deepUrlValue(
    record,
    "videoHdUrl", "video_hd_url", "videoSdUrl", "video_sd_url", "videoUrl", "video_url", "videoUrls",
    "originalImageUrl", "original_image_url", "resizedImageUrl", "resized_image_url", "imageUrl", "image_url", "imageUrls",
    "videoPreviewImageUrl", "video_preview_image_url", "videoPreviewImageUrls"
  );
}

function firstThumbnailUrl(record: JsonRecord) {
  return deepUrlValue(
    record,
    "videoPreviewImageUrl", "video_preview_image_url", "videoPreviewImageUrls",
    "thumbnailUrl", "thumbnail_url",
    "originalImageUrl", "original_image_url", "resizedImageUrl", "resized_image_url", "imageUrl", "image_url", "imageUrls"
  );
}

function mappedMediaType(record: JsonRecord): MediaType {
  const raw = stringValue(record, "mediaType", "media_type", "adFormat", "ad_format")?.toUpperCase();
  if (raw === "VIDEO") return MediaType.VIDEO;
  if (raw === "IMAGE" || raw === "MEME") return MediaType.IMAGE;
  if (raw === "CAROUSEL" || raw === "DPA") return MediaType.CAROUSEL;
  if (deepUrlValue(record, "videoHdUrl", "video_hd_url", "videoSdUrl", "video_sd_url", "videoUrl", "video_url", "videoUrls")) return MediaType.VIDEO;
  if (deepUrlValue(record, "originalImageUrl", "original_image_url", "resizedImageUrl", "resized_image_url", "imageUrl", "image_url", "imageUrls")) return MediaType.IMAGE;
  return MediaType.UNKNOWN;
}

export function normalizeApifyAd(record: JsonRecord) {
  const externalAdId = stringValue(record, "adArchiveID", "adArchiveId", "ad_archive_id", "ad_id", "id");
  if (!externalAdId) return null;
  const explicitPageId = stringValue(record, "pageID", "pageId", "page_id");
  const pageName = stringValue(record, "pageName", "page_name", "advertiserName") || "Bilinmeyen reklamveren";
  const pageId = explicitPageId || (pageName === "Bilinmeyen reklamveren" ? null : `name:${pageName.toLocaleLowerCase("en-US")}`);
  const firstSeenAt = dateValue(record.startDate ?? record.start_date ?? record.adDeliveryStartTime);
  const endDate = dateValue(record.endDate ?? record.end_date ?? record.adDeliveryStopTime);
  const referenceDate = endDate || new Date();
  const daysRunning = firstSeenAt ? Math.max(1, Math.ceil((referenceDate.getTime() - firstSeenAt.getTime()) / 86_400_000)) : null;
  const statusText = stringValue(record, "adStatus", "status", "ad_active_status", "ad_status")?.toUpperCase();
  const status = statusText === "ACTIVE" ? AdStatus.ACTIVE : statusText === "INACTIVE" ? AdStatus.INACTIVE : AdStatus.UNKNOWN;
  const primaryText = stringValue(record, "adText", "primaryText", "bodyText", "ad_body_text") || stringArray(record, "adCreativeBodies", "ad_creative_bodies")[0] || null;
  const countries = stringArray(record, "countries", "reachedCountries", "ad_reached_countries");
  const country = stringValue(record, "country", "pageCountry", "page_country");
  if (!countries.length && country) countries.push(country);

  const thumbnailUrl = firstThumbnailUrl(record);
  const creativeUrl = firstMediaUrl(record) || thumbnailUrl;

  return {
    externalAdId,
    pageId,
    pageName,
    pageUrl: stringValue(record, "pageURL", "pageUrl", "page_url"),
    pageLogoUrl: stringValue(record, "pageProfilePictureURL", "pageProfilePictureUrl", "page_profile_picture_url"),
    pageLikes: numberValue(record.pageLikes),
    pageFollowers: numberValue(record.pageInstagramFollowers),
    status,
    mediaType: mappedMediaType(record),
    primaryText,
    headline: stringValue(record, "ctaHeadline", "headline", "title", "ad_headline"),
    description: stringValue(record, "ctaDescription", "description", "ad_description"),
    ctaText: stringValue(record, "ctaText", "ctaType", "callToAction", "cta_text"),
    landingUrl: stringValue(record, "ctaUrl", "landingUrl", "linkUrl", "landing_page_url"),
    productUrl: stringValue(record, "adLibraryURL", "adLibraryUrl", "ad_library_url"),
    language: stringValue(record, "language"),
    countries,
    firstSeenAt,
    lastSeenAt: endDate,
    createdAtSource: dateValue(record.adCreationTime ?? record.ad_creation_time),
    daysRunning: numberValue(record.ad_active_duration_days) ?? daysRunning,
    estimatedReachMin: numberValue(record.reachEstimate),
    estimatedSpendMin: numberValue(record.spend),
    creativeUrl,
    thumbnailUrl,
    raw: record as Prisma.InputJsonValue
  };
}

function apifyConfig() {
  const token = process.env.APIFY_TOKEN?.trim();
  const actorId = (process.env.APIFY_ACTOR_ID?.trim() || DEFAULT_ACTOR_ID).replace("/", "~");
  if (!token) throw new Error("APIFY_NOT_CONFIGURED");
  if (!/^[a-zA-Z0-9_-]+~[a-zA-Z0-9_-]+$/.test(actorId)) throw new Error("APIFY_ACTOR_INVALID");
  return { token, actorId };
}

export async function runApifyActor(input: ApifyIngestInput) {
  const { token, actorId } = apifyConfig();
  const query = new URLSearchParams({
    clean: "true",
    timeout: "180",
    maxItems: String(input.maxResults),
    maxTotalChargeUsd: String(input.maxCostUsd)
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 210_000);
  try {
    const response = await fetch(`${APIFY_API_BASE}/actors/${actorId}/run-sync-get-dataset-items?${query}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(actorInput(actorId, input)),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`APIFY_HTTP_${response.status}`);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error("APIFY_INVALID_RESPONSE");
    return payload.filter((item): item is JsonRecord => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("APIFY_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function actorInput(actorId: string, input: ApifyIngestInput) {
  if (actorId === "aiscraperdev~facebook-meta-ads-library-scraper") {
    return {
      searchQueries: input.searchTerms,
      countryCode: input.country,
      adStatus: input.adActiveStatus.toLowerCase(),
      adType: "all",
      mediaType: input.mediaType.toLowerCase(),
      platform: "all",
      maxResults: input.maxResults
    };
  }

  return {
    searchTerms: input.searchTerms,
    country: input.country,
    adActiveStatus: input.adActiveStatus,
    mediaType: input.mediaType,
    adType: "ALL",
    maxResults: input.maxResults,
    scrapeAdDetails: input.scrapeAdDetails,
    includeAboutPage: input.includeAboutPage
  };
}

export async function importApifyAds(records: JsonRecord[]) {
  let imported = 0;
  let failed = 0;
  for (const record of records) {
    const item = normalizeApifyAd(record);
    if (!item) { failed += 1; continue; }
    try {
      let brandPageId: string | null = null;
      if (item.pageId) {
        const brand = await prisma.brandPage.upsert({
          where: { source_externalPageId: { source: AdSource.META, externalPageId: item.pageId } },
          create: { source: AdSource.META, externalPageId: item.pageId, name: item.pageName, pageUrl: item.pageUrl, logoUrl: item.pageLogoUrl, fbLikes: item.pageLikes, igFollowers: item.pageFollowers },
          update: { name: item.pageName, pageUrl: item.pageUrl, logoUrl: item.pageLogoUrl, fbLikes: item.pageLikes, igFollowers: item.pageFollowers }
        });
        brandPageId = brand.id;
      }
      const creative = item.creativeUrl ? { type: item.mediaType, url: item.creativeUrl, thumbnailUrl: item.thumbnailUrl } : null;
      await prisma.ad.upsert({
        where: { source_externalAdId: { source: AdSource.META, externalAdId: item.externalAdId } },
        create: {
          source: AdSource.META, externalAdId: item.externalAdId, brandPageId, status: item.status, mediaType: item.mediaType,
          primaryText: item.primaryText, headline: item.headline, description: item.description, ctaText: item.ctaText,
          landingUrl: item.landingUrl, productUrl: item.productUrl, language: item.language, countries: item.countries,
          firstSeenAt: item.firstSeenAt, lastSeenAt: item.lastSeenAt, createdAtSource: item.createdAtSource, daysRunning: item.daysRunning,
          estimatedReachMin: item.estimatedReachMin, estimatedSpendMin: item.estimatedSpendMin, raw: item.raw,
          ...(creative ? { creatives: { create: creative } } : {})
        },
        update: {
          brandPageId, status: item.status, mediaType: item.mediaType, primaryText: item.primaryText, headline: item.headline,
          description: item.description, ctaText: item.ctaText, landingUrl: item.landingUrl, productUrl: item.productUrl,
          language: item.language, countries: item.countries, firstSeenAt: item.firstSeenAt, lastSeenAt: item.lastSeenAt,
          createdAtSource: item.createdAtSource, daysRunning: item.daysRunning, estimatedReachMin: item.estimatedReachMin,
          estimatedSpendMin: item.estimatedSpendMin, raw: item.raw,
          ...(creative ? { creatives: { deleteMany: {}, create: creative } } : {})
        }
      });
      imported += 1;
    } catch {
      failed += 1;
    }
  }
  return { imported, failed };
}
