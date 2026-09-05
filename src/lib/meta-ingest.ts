import { importApifyAds, runApifyActor, selectMediaRecordsForSearch } from "@/lib/apify";
import { searchMetaAds } from "@/lib/meta-ads";
import type { AdSearchMatchMode } from "@/lib/ad-search";

export type MetaIngestTermInput = {
  searchTerm: string;
  country: string;
  status: "ACTIVE" | "INACTIVE" | "ALL";
  matchMode: AdSearchMatchMode;
  mediaType: "ALL" | "IMAGE" | "VIDEO" | "MEME";
  maxResults: number;
};

// Tek bir arama terimi için resmi Meta Ad Library sonuçlarını ve medya katmanını birlikte içe aktarır.
export async function ingestMetaAdsForTerm(input: MetaIngestTermInput) {
  const [meta, mediaRecords] = await Promise.all([
    searchMetaAds({ searchTerm: input.searchTerm, country: input.country, adActiveStatus: input.status, matchMode: input.matchMode, maxResults: input.maxResults }),
    runApifyActor({
      searchTerms: [input.searchTerm],
      country: input.country,
      adActiveStatus: input.status,
      mediaType: input.mediaType,
      maxResults: input.maxResults,
      maxCostUsd: Math.max(0.1, Math.ceil(input.maxResults * 0.004 * 10) / 10),
      scrapeAdDetails: true,
      includeAboutPage: false
    })
  ]);
  const selection = selectMediaRecordsForSearch(mediaRecords, meta.relevant, input.searchTerm, input.matchMode, input.mediaType, input.maxResults);
  const official = await importApifyAds(meta.relevant);
  const media = await importApifyAds(selection.records);
  return {
    searchTerm: input.searchTerm,
    received: meta.received,
    relevant: meta.relevant.length,
    imported: official.imported + media.imported,
    mediaEnriched: media.imported,
    failed: official.failed + media.failed
  };
}
