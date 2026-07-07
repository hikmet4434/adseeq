import { PlanCode } from "@prisma/client";

export function maskAdForPlan<T extends Record<string, any>>(ad: T, planCode?: PlanCode): T & { isLocked: boolean } {
  if (planCode && planCode !== "FREE") return { ...ad, isLocked: false };
  return {
    ...ad,
    primaryText: ad.primaryText ? `${String(ad.primaryText).slice(0, 90)}...` : null,
    estimatedSpendMin: null,
    estimatedSpendMax: null,
    estimatedReachMin: null,
    estimatedReachMax: null,
    landingUrl: null,
    productUrl: null,
    isLocked: true
  };
}
