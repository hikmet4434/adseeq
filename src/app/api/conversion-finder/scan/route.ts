import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { planFromUser } from "@/lib/plans";
import { checkAndConsumeQuota, refundQuota } from "@/lib/quota";
import { hizSiniriAsimi } from "@/lib/rate-limit";
import { AD_COUNTRY_CODES } from "@/lib/countries";
import { TR_MARKET_SCAN_TERMS } from "@/lib/conversion-finder";
import { ingestMetaAdsForTerm } from "@/lib/meta-ingest";

const schema = z.object({
  country: z.string().trim().toUpperCase().refine((value) => AD_COUNTRY_CODES.has(value) && value !== "ALL").default("TR"),
  terms: z.array(z.string().trim().min(2).max(60)).min(1).max(10).default([...TR_MARKET_SCAN_TERMS]),
  perTerm: z.coerce.number().int().refine((value) => [10, 25, 50].includes(value)).default(25)
});

function planAllowsScan(planCode: string | undefined, isAdmin: boolean) {
  return isAdmin || planCode === "PREMIUM" || planCode === "STANDARD" || planCode === "BASIC";
}

export async function POST(request: Request) {
  const limited = hizSiniriAsimi(request, "arama");
  if (limited) return limited;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse((await request.json().catch(() => null)) ?? {});
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const plan = planFromUser(user as never);
  const isAdmin = user.role === "ADMIN";
  if (!planAllowsScan(plan?.code, isAdmin)) return NextResponse.json({ error: "UPGRADE_REQUIRED" }, { status: 403 });

  const { country, terms, perTerm } = parsed.data;
  const creditsNeeded = terms.length * perTerm;
  let dailyReserved = false;
  let creditsReserved = false;
  if (!isAdmin) {
    const daily = await checkAndConsumeQuota({ userId: user.id, plan, metric: "ads_search_daily" });
    if (!daily.allowed) return NextResponse.json({ error: "DAILY_QUOTA_EXCEEDED", usage: daily }, { status: 403 });
    dailyReserved = true;
    const credits = await checkAndConsumeQuota({ userId: user.id, plan, metric: "api_credits_monthly", amount: creditsNeeded });
    if (!credits.allowed) {
      await refundQuota({ userId: user.id, metric: "ads_search_daily" });
      return NextResponse.json({ error: "API_CREDITS_EXCEEDED", usage: credits }, { status: 403 });
    }
    creditsReserved = true;
  }

  const job = await prisma.ingestJob.create({
    data: { source: "meta", type: "conversion-finder-scan", status: "RUNNING", startedAt: new Date(), metadata: { userId: user.id, country, terms, perTerm } }
  });

  const termResults: Array<{ searchTerm: string; received: number; relevant: number; imported: number; failed: number; error?: string }> = [];
  let delivered = 0;
  for (const searchTerm of terms) {
    try {
      const result = await ingestMetaAdsForTerm({ searchTerm, country, status: "ACTIVE", matchMode: "ALL_WORDS", mediaType: "ALL", maxResults: perTerm });
      delivered += Math.min(perTerm, result.imported);
      termResults.push(result);
    } catch (error) {
      const code = error instanceof Error && /^(META|APIFY)_[A-Z0-9_]+$/.test(error.message) ? error.message : "META_INGEST_FAILED";
      termResults.push({ searchTerm, received: 0, relevant: 0, imported: 0, failed: 0, error: code });
      if (code.endsWith("NOT_CONFIGURED")) break;
    }
  }

  const imported = termResults.reduce((sum, item) => sum + item.imported, 0);
  const failedTerms = termResults.filter((item) => item.error);
  if (creditsReserved && delivered < creditsNeeded) await refundQuota({ userId: user.id, metric: "api_credits_monthly", amount: creditsNeeded - delivered });
  if (dailyReserved && imported === 0) await refundQuota({ userId: user.id, metric: "ads_search_daily" });

  const allFailed = failedTerms.length === termResults.length;
  await prisma.ingestJob.update({
    where: { id: job.id },
    data: {
      status: allFailed ? "FAILED" : "COMPLETED",
      finishedAt: new Date(),
      recordsImported: imported,
      recordsFailed: termResults.reduce((sum, item) => sum + item.failed, 0),
      errorMessage: allFailed ? failedTerms[0]?.error : null,
      metadata: { userId: user.id, country, terms, perTerm, results: termResults }
    }
  });

  if (allFailed) {
    const code = failedTerms[0]?.error || "META_INGEST_FAILED";
    return NextResponse.json({ error: code, results: termResults }, { status: code.endsWith("NOT_CONFIGURED") ? 503 : 502 });
  }
  return NextResponse.json({ ok: true, country, imported, scannedTerms: termResults.length, failedTerms: failedTerms.length, results: termResults });
}
