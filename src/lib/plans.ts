import { type Plan, PlanCode, type Subscription, SubscriptionStatus } from "@prisma/client";

export type PlanWithFeatures = Plan & { features: Record<string, unknown> };

export const FREE_PLAN_FEATURES = Object.freeze({
  adsSearchDaily: 10,
  storesSearchDaily: null,
  tiktokSearchDaily: 0,
  trendsSearchDaily: 5,
  apiCreditsMonthly: 0,
  trackedStores: 0,
  followedBrands: 0,
  savedAds: 20,
  advancedFilters: false,
  lockedResults: true,
  exportEnabled: false
});

export const FREE_PLAN = Object.freeze({
  id: "free-fallback",
  code: PlanCode.FREE,
  name: "Free",
  monthlyPriceEur: 0,
  quarterlyPriceEur: 0,
  yearlyPriceEur: 0,
  description: null,
  features: FREE_PLAN_FEATURES,
  isActive: true,
  sortOrder: 0,
  createdAt: new Date(0),
  updatedAt: new Date(0)
}) as PlanWithFeatures;

export type UserSubscriptionLike = {
  status: SubscriptionStatus | string;
  currentPeriodEnd?: Date | string | null;
  plan?: Plan | null;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set<string>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING
]);

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
  return Boolean(planCode && planCode !== "FREE");
}

export function getFeatureLimit(plan: PlanWithFeatures | null | undefined, metric: string) {
  if (!plan) return 0;
  const featureKey = metricToFeature[metric] || metric;
  const value = plan.features?.[featureKey];
  if (value === null) return null;
  if (typeof value === "number") return value;
  return 0;
}

export function isSubscriptionActive(
  subscription: UserSubscriptionLike | null | undefined,
  now = new Date()
): subscription is UserSubscriptionLike & { plan: Plan } {
  if (!subscription?.plan) return false;
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) return false;
  if (subscription.currentPeriodEnd != null) {
    const end = subscription.currentPeriodEnd instanceof Date
      ? subscription.currentPeriodEnd
      : new Date(subscription.currentPeriodEnd);
    if (Number.isNaN(end.getTime()) || end.getTime() <= now.getTime()) return false;
  }
  return true;
}

export function planFromUser(
  user: { subscription?: (Subscription & { plan: Plan }) | UserSubscriptionLike | null } | null | undefined,
  now = new Date()
): PlanWithFeatures {
  if (!isSubscriptionActive(user?.subscription, now)) return FREE_PLAN;
  return user!.subscription!.plan as PlanWithFeatures;
}

export function hasPaidPlan(
  user: { role?: string | null; subscription?: (Subscription & { plan: Plan }) | UserSubscriptionLike | null } | null | undefined,
  now = new Date()
) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return planAllowsFullAds(planFromUser(user, now).code);
}
