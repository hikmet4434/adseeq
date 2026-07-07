import { UsagePeriod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFeatureLimit } from "@/lib/plans";

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function nextMidnight() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function nextMonthStart() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function periodForMetric(metric: string) {
  if (metric.includes("monthly")) return UsagePeriod.MONTHLY;
  if (metric.includes("daily")) return UsagePeriod.DAILY;
  return UsagePeriod.LIFETIME;
}

export function keyForPeriod(period: UsagePeriod) {
  if (period === UsagePeriod.MONTHLY) return monthKey();
  if (period === UsagePeriod.DAILY) return dayKey();
  return "lifetime";
}

export function resetForPeriod(period: UsagePeriod) {
  if (period === UsagePeriod.MONTHLY) return nextMonthStart();
  if (period === UsagePeriod.DAILY) return nextMidnight();
  return null;
}

export async function usageSummary(userId: string) {
  const rows = await prisma.usageCounter.findMany({
    where: { userId },
    orderBy: { metric: "asc" }
  });
  return rows.map((row) => ({
    metric: row.metric,
    used: row.used,
    limit: row.limit,
    remaining: row.limit === null ? null : Math.max(0, (row.limit ?? 0) - row.used),
    resetAt: row.resetAt
  }));
}

export async function checkAndConsumeQuota(params: {
  userId: string;
  plan: { features: Record<string, unknown> } | null | undefined;
  metric: string;
  amount?: number;
}) {
  const amount = params.amount ?? 1;
  const limit = getFeatureLimit(params.plan as any, params.metric);
  if (limit === null) {
    return { allowed: true, used: 0, limit: null, remaining: null, resetAt: null };
  }

  const period = periodForMetric(params.metric);
  const periodKey = keyForPeriod(period);
  const resetAt = resetForPeriod(period);

  const counter = await prisma.usageCounter.upsert({
    where: {
      userId_metric_periodKey: {
        userId: params.userId,
        metric: params.metric,
        periodKey
      }
    },
    update: {},
    create: {
      userId: params.userId,
      metric: params.metric,
      period,
      periodKey,
      used: 0,
      limit,
      resetAt
    }
  });

  if (counter.used + amount > limit) {
    return {
      allowed: false,
      used: counter.used,
      limit,
      remaining: Math.max(0, limit - counter.used),
      resetAt: counter.resetAt
    };
  }

  const updated = await prisma.usageCounter.update({
    where: { id: counter.id },
    data: { used: { increment: amount }, limit, resetAt }
  });

  return {
    allowed: true,
    used: updated.used,
    limit,
    remaining: Math.max(0, limit - updated.used),
    resetAt: updated.resetAt
  };
}
