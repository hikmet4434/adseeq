import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/current-user";
import { importApifyAds, normalizeApifyAd, relevantApifyRecords, runApifyActor } from "@/lib/apify";
import { searchMetaAds } from "@/lib/meta-ads";
import { prisma } from "@/lib/db";
import { planFromUser } from "@/lib/plans";
import { checkAndConsumeQuota, refundQuota } from "@/lib/quota";
import { hizSiniriAsimi } from "@/lib/rate-limit";
import { AD_COUNTRY_CODES } from "@/lib/countries";

const schema = z.object({
  searchTerm: z.string().trim().min(2).max(100),
  country: z.string().trim().toUpperCase().refine((value) => AD_COUNTRY_CODES.has(value)),
  mediaType: z.enum(["ALL", "IMAGE", "VIDEO", "MEME"]),
  matchMode: z.enum(["ALL_WORDS", "EXACT_PHRASE"]).default("ALL_WORDS"),
  status: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ACTIVE"),
  maxResults: z.coerce.number().int().refine((value) => [10, 25, 50, 100].includes(value))
});

function planResultLimit(planCode: string | undefined, isAdmin: boolean) {
  if (isAdmin || planCode === "PREMIUM") return 100;
  if (planCode === "STANDARD") return 50;
  if (planCode === "BASIC") return 25;
  return 0;
}

export async function POST(request: Request) {
  const limited = hizSiniriAsimi(request, "arama");
  if (limited) return limited;

  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const plan = planFromUser(user as never);
  const isAdmin = user.role === "ADMIN";
  const resultLimit = planResultLimit(plan?.code, isAdmin);
  if (resultLimit === 0) return NextResponse.json({ error: "UPGRADE_REQUIRED" }, { status: 403 });
  if (parsed.data.maxResults > resultLimit) {
    return NextResponse.json({ error: "PLAN_LIMIT_EXCEEDED", maxResults: resultLimit }, { status: 403 });
  }

  let dailyReserved = false;
  let creditsReserved = false;
  if (!isAdmin) {
    const daily = await checkAndConsumeQuota({ userId: user.id, plan, metric: "ads_search_daily" });
    if (!daily.allowed) return NextResponse.json({ error: "DAILY_QUOTA_EXCEEDED", usage: daily }, { status: 403 });
    dailyReserved = true;

    const credits = await checkAndConsumeQuota({ userId: user.id, plan, metric: "api_credits_monthly", amount: parsed.data.maxResults });
    if (!credits.allowed) {
      await refundQuota({ userId: user.id, metric: "ads_search_daily" });
      return NextResponse.json({ error: "API_CREDITS_EXCEEDED", usage: credits }, { status: 403 });
    }
    creditsReserved = true;
  }

  const job = await prisma.ingestJob.create({
    data: {
      source: "meta",
      type: "meta-ads-library",
      status: "RUNNING",
      startedAt: new Date(),
      metadata: { userId: user.id, searchTerm: parsed.data.searchTerm, country: parsed.data.country, mediaType: parsed.data.mediaType, matchMode: parsed.data.matchMode, status: parsed.data.status, maxResults: parsed.data.maxResults }
    }
  });

  try {
    const meta = await searchMetaAds({
      searchTerm: parsed.data.searchTerm,
      country: parsed.data.country,
      adActiveStatus: parsed.data.status,
      matchMode: parsed.data.matchMode,
      maxResults: parsed.data.maxResults
    });
    // Meta Ad Library ham medya dosyası vermez. Doğrulanan reklamların görsel/video
    // dosyaları mevcut medya katmanından tamamlanır; Meta token'ı istemciye çıkmaz.
    const candidateLimit = Math.min(parsed.data.maxResults * 3, 300);
    const mediaRecords = await runApifyActor({
      searchTerms: [parsed.data.searchTerm],
      country: parsed.data.country,
      adActiveStatus: parsed.data.status,
      mediaType: parsed.data.mediaType,
      maxResults: candidateLimit,
      maxCostUsd: Math.max(0.1, Math.ceil(parsed.data.maxResults * 0.004 * 10) / 10),
      scrapeAdDetails: true,
      includeAboutPage: false
    });
    const officialIds = new Set(meta.relevant.map((record) => String(record.adArchiveID || "")));
    const relevantMediaRecords = relevantApifyRecords(mediaRecords, parsed.data.searchTerm, parsed.data.matchMode, parsed.data.maxResults)
      .filter((record) => {
        const normalized = normalizeApifyAd(record);
        return normalized ? officialIds.has(normalized.externalAdId) : false;
      });
    const officialResult = await importApifyAds(meta.relevant);
    const mediaResult = await importApifyAds(relevantMediaRecords);
    const delivered = Math.min(meta.relevant.length, relevantMediaRecords.length);
    if (creditsReserved && delivered < parsed.data.maxResults) {
      await refundQuota({ userId: user.id, metric: "api_credits_monthly", amount: parsed.data.maxResults - delivered });
    }
    await prisma.ingestJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
        recordsImported: mediaResult.imported,
        recordsFailed: officialResult.failed + mediaResult.failed,
        metadata: { userId: user.id, provider: "meta", searchTerm: parsed.data.searchTerm, country: parsed.data.country, mediaType: parsed.data.mediaType, matchMode: parsed.data.matchMode, status: parsed.data.status, maxResults: parsed.data.maxResults, received: meta.received, relevant: meta.relevant.length, mediaEnriched: mediaResult.imported }
      }
    });
    return NextResponse.json({ ok: true, provider: "meta", imported: mediaResult.imported, failed: officialResult.failed + mediaResult.failed, received: meta.received, relevant: meta.relevant.length, mediaEnriched: mediaResult.imported });
  } catch (error) {
    if (dailyReserved) await refundQuota({ userId: user.id, metric: "ads_search_daily" });
    if (creditsReserved) await refundQuota({ userId: user.id, metric: "api_credits_monthly", amount: parsed.data.maxResults });
    const code = error instanceof Error && /^(META|APIFY)_[A-Z0-9_]+$/.test(error.message) ? error.message : "META_INGEST_FAILED";
    await prisma.ingestJob.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), errorMessage: code } });
    return NextResponse.json({ error: code }, { status: code.endsWith("NOT_CONFIGURED") ? 503 : 502 });
  }
}
