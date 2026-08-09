import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/current-user";
import { importTikTokProducts, runTikTokShopActor } from "@/lib/apify-tiktok";
import { planFromUser } from "@/lib/plans";
import { checkAndConsumeQuota, refundQuota } from "@/lib/quota";
import { hizSiniriAsimi } from "@/lib/rate-limit";

const schema = z.object({ query: z.string().trim().min(2).max(100), region: z.enum(["US", "GB", "DE", "FR", "TR"]).default("US"), maxResults: z.coerce.number().int().refine((v) => [10, 25, 50].includes(v)) });

export async function POST(request: Request) {
  const limited = hizSiniriAsimi(request, "arama");
  if (limited) return limited;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const plan = planFromUser(user as never);
  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && (!plan || plan.code === "FREE")) return NextResponse.json({ error: "UPGRADE_REQUIRED" }, { status: 403 });
  const max = isAdmin || plan?.code === "PREMIUM" ? 50 : plan?.code === "STANDARD" ? 25 : 10;
  if (parsed.data.maxResults > max) return NextResponse.json({ error: "PLAN_LIMIT_EXCEEDED", maxResults: max }, { status: 403 });
  let daily = false;
  let credits = false;
  if (!isAdmin) {
    const dailyQuota = await checkAndConsumeQuota({ userId: user.id, plan, metric: "tiktok_search_daily" });
    if (!dailyQuota.allowed) return NextResponse.json({ error: "DAILY_QUOTA_EXCEEDED", usage: dailyQuota }, { status: 403 });
    daily = true;
    const apiQuota = await checkAndConsumeQuota({ userId: user.id, plan, metric: "api_credits_monthly", amount: parsed.data.maxResults });
    if (!apiQuota.allowed) { await refundQuota({ userId: user.id, metric: "tiktok_search_daily" }); return NextResponse.json({ error: "API_CREDITS_EXCEEDED", usage: apiQuota }, { status: 403 }); }
    credits = true;
  }
  try {
    const rows = await runTikTokShopActor(parsed.data);
    const result = await importTikTokProducts(rows, parsed.data.region);
    if (credits && rows.length < parsed.data.maxResults) await refundQuota({ userId: user.id, metric: "api_credits_monthly", amount: parsed.data.maxResults - rows.length });
    return NextResponse.json({ ok: true, ...result, received: rows.length });
  } catch (error) {
    if (daily) await refundQuota({ userId: user.id, metric: "tiktok_search_daily" });
    if (credits) await refundQuota({ userId: user.id, metric: "api_credits_monthly", amount: parsed.data.maxResults });
    const code = error instanceof Error && /^APIFY_[A-Z0-9_]+$/.test(error.message) ? error.message : "APIFY_TIKTOK_FAILED";
    return NextResponse.json({ error: code }, { status: code === "APIFY_NOT_CONFIGURED" ? 503 : 502 });
  }
}
