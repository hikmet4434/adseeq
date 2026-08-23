import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/current-user";
import { importApifyAds, runApifyActor, selectMediaRecordsForSearch } from "@/lib/apify";
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
    // Meta Ad Library ham medya dosyası vermez. Doğrulanan reklamların görsel/video
    // dosyaları aynı Meta Ads Library sorgusunun medya katmanından tamamlanır.
    // İki uzak çağrı paralel çalışır; resmi kimlik eşleşmeleri önceliklidir, ancak
    // farklı sayfalama nedeniyle kimliği kesişmeyen ilgili medya sonuçları atılmaz.
    const [meta, mediaRecords] = await Promise.all([
      searchMetaAds({
        searchTerm: parsed.data.searchTerm,
        country: parsed.data.country,
        adActiveStatus: parsed.data.status,
        matchMode: parsed.data.matchMode,
        maxResults: parsed.data.maxResults
      }),
      runApifyActor({
        searchTerms: [parsed.data.searchTerm],
        country: parsed.data.country,
        adActiveStatus: parsed.data.status,
        mediaType: parsed.data.mediaType,
        maxResults: parsed.data.maxResults,
        maxCostUsd: Math.max(0.1, Math.ceil(parsed.data.maxResults * 0.004 * 10) / 10),
        scrapeAdDetails: true,
        includeAboutPage: false
      })
    ]);
    const mediaSelection = selectMediaRecordsForSearch(
      mediaRecords,
      meta.relevant,
      parsed.data.searchTerm,
      parsed.data.matchMode,
      parsed.data.mediaType,
      parsed.data.maxResults
    );
    const officialResult = await importApifyAds(meta.relevant);
    const mediaResult = await importApifyAds(mediaSelection.records);
    const delivered = Math.min(parsed.data.maxResults, mediaResult.imported);
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
        metadata: { userId: user.id, provider: "meta", searchTerm: parsed.data.searchTerm, country: parsed.data.country, mediaType: parsed.data.mediaType, matchMode: parsed.data.matchMode, status: parsed.data.status, maxResults: parsed.data.maxResults, received: meta.received, relevant: meta.relevant.length, mediaCandidates: mediaRecords.length, officialMediaMatches: mediaSelection.officialMatches, fallbackMediaMatches: mediaSelection.fallbackMatches, mediaEnriched: mediaResult.imported }
      }
    });
    return NextResponse.json({ ok: true, provider: "meta", imported: mediaResult.imported, failed: officialResult.failed + mediaResult.failed, received: meta.received, relevant: meta.relevant.length, mediaCandidates: mediaRecords.length, mediaEnriched: mediaResult.imported });
  } catch (error) {
    if (dailyReserved) await refundQuota({ userId: user.id, metric: "ads_search_daily" });
    if (creditsReserved) await refundQuota({ userId: user.id, metric: "api_credits_monthly", amount: parsed.data.maxResults });
    const code = error instanceof Error && /^(META|APIFY)_[A-Z0-9_]+$/.test(error.message) ? error.message : "META_INGEST_FAILED";
    await prisma.ingestJob.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), errorMessage: code } });
    return NextResponse.json({ error: code }, { status: code.endsWith("NOT_CONFIGURED") ? 503 : 502 });
  }
}
