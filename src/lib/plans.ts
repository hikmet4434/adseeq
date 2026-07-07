import { Plan, PlanCode, Subscription } from "@prisma/client";

export type PlanWithFeatures = Plan & { features: Record<string, unknown> };

export const metricToFeature: Record<string, string> = {
  ads_search_daily: "adsSearchDaily",
  stores_search_daily: "storesSearchDaily",
  tiktok_search_daily: "tiktokSearchDaily",
  trends_search_daily: "trendsSearchDaily",
  api_credits_monthly: "apiCreditsMonthly",
  tracked_stores: "trackedStores",
  followed_brands: "followedBrands",
  saved_ads: "savedAds"
};

export function planAllowsFullAds(planCode?: PlanCode) {
  return planCode && planCode !== "FREE";
}

export function getFeatureLimit(plan: PlanWithFeatures | null | undefined, metric: string) {
  if (!plan) return 0;
  const featureKey = metricToFeature[metric] || metric;
  const value = plan.features?.[featureKey];
  if (value === null) return null;
  if (typeof value === "number") return value;
  return 0;
}

export function planFromUser(user: { subscription?: (Subscription & { plan: Plan }) | null }) {
  return user.subscription?.plan as PlanWithFeatures | undefined;
}
