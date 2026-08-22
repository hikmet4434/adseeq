export type AdSearchMatchMode = "ALL_WORDS" | "EXACT_PHRASE";

type SearchableAd = {
  primaryText?: string | null;
  headline?: string | null;
  description?: string | null;
  ctaText?: string | null;
  brandName?: string | null;
};

export function normalizeAdSearchText(value: string | null | undefined) {
  return (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function adSearchTokens(query: string) {
  return [...new Set(normalizeAdSearchText(query).split(" ").filter(Boolean))];
}

function containsPhrase(text: string, phrase: string) {
  return Boolean(text && phrase && ` ${text} `.includes(` ${phrase} `));
}

export function adSearchRelevance(ad: SearchableAd, query: string, mode: AdSearchMatchMode = "ALL_WORDS") {
  const phrase = normalizeAdSearchText(query);
  const tokens = adSearchTokens(query);
  if (!phrase || tokens.length === 0) return 0;

  const fields = [
    [normalizeAdSearchText(ad.headline), 12],
    [normalizeAdSearchText(ad.brandName), 10],
    [normalizeAdSearchText(ad.primaryText), 7],
    [normalizeAdSearchText(ad.description), 4],
    [normalizeAdSearchText(ad.ctaText), 2]
  ] as const;
  const combined = fields.map(([text]) => text).filter(Boolean).join(" ");
  const combinedTokens = new Set(combined.split(" ").filter(Boolean));
  const matches = mode === "EXACT_PHRASE"
    ? fields.some(([text]) => containsPhrase(text, phrase))
    : tokens.every((token) => combinedTokens.has(token));
  if (!matches) return 0;

  let score = 1;
  for (const [text, weight] of fields) {
    if (containsPhrase(text, phrase)) score += weight * 3;
    score += tokens.filter((token) => text.split(" ").includes(token)).length * weight;
  }
  return score;
}

export function filterRelevantAds<T extends SearchableAd>(ads: T[], query: string, mode: AdSearchMatchMode, limit: number) {
  return ads
    .map((ad, index) => ({ ad, index, score: adSearchRelevance(ad, query, mode) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map((item) => item.ad);
}
