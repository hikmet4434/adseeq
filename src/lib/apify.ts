import { AdSource, AdStatus, MediaType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const APIFY_API_BASE = "https://api.apify.com/v2";
const DEFAULT_ACTOR_ID = "solidcode~meta-ads-library-scraper";

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

function dateValue(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstMediaUrl(record: JsonRecord) {
  const arrays = ["videoUrls", "videos", "imageUrls", "images", "videoPreviewImageUrls"];
  for (const key of arrays) {
    const values = stringArray(record, key);
    if (values[0]) return values[0];
  }
  return stringValue(record, "videoHdUrl", "videoUrl", "imageUrl", "adSnapshotUrl", "snapshotUrl");
}

function firstThumbnailUrl(record: JsonRecord) {
  for (const key of ["videoPreviewImageUrls", "imageUrls", "images"]) {
    const values = stringArray(record, key);
    if (values[0]) return values[0];
  }
  return stringValue(record, "thumbnailUrl", "imageUrl", "pageProfilePictureURL");
}

function mappedMediaType(record: JsonRecord): MediaType {
  const raw = stringValue(record, "mediaType", "media_type", "adFormat")?.toUpperCase();
  if (raw === "VIDEO") return MediaType.VIDEO;
  if (raw === "IMAGE" || raw === "MEME") return MediaType.IMAGE;
  if (raw === "CAROUSEL" || raw === "DPA") return MediaType.CAROUSEL;
  if (stringArray(record, "videoUrls", "videos").length) return MediaType.VIDEO;
  if (stringArray(record, "imageUrls", "images").length) return MediaType.IMAGE;
  return MediaType.UNKNOWN;
}

export function normalizeApifyAd(record: JsonRecord) {
  const externalAdId = stringValue(record, "adArchiveID", "adArchiveId", "ad_archive_id", "id");
  if (!externalAdId) return null;
  const pageId = stringValue(record, "pageID", "pageId", "page_id");
  const pageName = stringValue(record, "pageName", "page_name", "advertiserName") || "Bilinmeyen reklamveren";
  const firstSeenAt = dateValue(record.startDate ?? record.start_date ?? record.adDeliveryStartTime);
  const endDate = dateValue(record.endDate ?? record.end_date ?? record.adDeliveryStopTime);
  const referenceDate = endDate || new Date();
  const daysRunning = firstSeenAt ? Math.max(1, Math.ceil((referenceDate.getTime() - firstSeenAt.getTime()) / 86_400_000)) : null;
  const statusText = stringValue(record, "adStatus", "status", "ad_active_status")?.toUpperCase();
  const status = statusText === "ACTIVE" ? AdStatus.ACTIVE : statusText === "INACTIVE" ? AdStatus.INACTIVE : AdStatus.UNKNOWN;
  const primaryText = stringValue(record, "adText", "primaryText", "bodyText") || stringArray(record, "adCreativeBodies", "ad_creative_bodies")[0] || null;
  const countries = stringArray(record, "countries", "reachedCountries", "ad_reached_countries");
  const country = stringValue(record, "country", "pageCountry");
  if (!countries.length && country) countries.push(country);

  return {
    externalAdId,
    pageId,
    pageName,
    pageUrl: stringValue(record, "pageURL", "pageUrl"),
    pageLogoUrl: stringValue(record, "pageProfilePictureURL", "pageProfilePictureUrl"),
    pageLikes: numberValue(record.pageLikes),
    pageFollowers: numberValue(record.pageInstagramFollowers),
    status,
    mediaType: mappedMediaType(record),
    primaryText,
    headline: stringValue(record, "ctaHeadline", "headline", "title"),
    description: stringValue(record, "ctaDescription", "description"),
    ctaText: stringValue(record, "ctaText", "ctaType", "callToAction"),
    landingUrl: stringValue(record, "ctaUrl", "landingUrl", "linkUrl"),
    productUrl: stringValue(record, "adLibraryURL", "adLibraryUrl"),
    language: stringValue(record, "language"),
    countries,
    firstSeenAt,
    lastSeenAt: endDate,
    createdAtSource: dateValue(record.adCreationTime ?? record.ad_creation_time),
    daysRunning,
    estimatedReachMin: numberValue(record.reachEstimate),
    estimatedSpendMin: numberValue(record.spend),
    creativeUrl: firstMediaUrl(record),
    thumbnailUrl: firstThumbnailUrl(record),
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
      body: JSON.stringify({
        searchTerms: input.searchTerms,
        country: input.country,
        adActiveStatus: input.adActiveStatus,
        mediaType: input.mediaType,
        adType: "ALL",
        maxResults: input.maxResults,
        scrapeAdDetails: input.scrapeAdDetails,
        includeAboutPage: input.includeAboutPage
      }),
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

