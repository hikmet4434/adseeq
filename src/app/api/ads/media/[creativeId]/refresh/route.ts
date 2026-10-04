import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { importApifyAds, normalizeApifyAd, runApifyActor } from "@/lib/apify";
import { planFromUser } from "@/lib/plans";
import { checkAndConsumeQuota, refundQuota } from "@/lib/quota";
import { hizSiniriAsimi } from "@/lib/rate-limit";
import { AD_COUNTRY_CODES } from "@/lib/countries";

// Süresi dolmuş Meta video/görsel bağlantısını yeniler: reklamverenin reklamları
// Apify ile yeniden çekilir, aynı reklam kimliği bulunursa medyası güncellenir.
const REFRESH_RESULTS = 50;

export async function POST(request: Request, context: { params: Promise<{ creativeId: string }> }) {
  const limited = hizSiniriAsimi(request, "arama");
  if (limited) return limited;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const plan = planFromUser(user as never);
  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && (!plan?.code || plan.code === "FREE")) return NextResponse.json({ error: "UPGRADE_REQUIRED" }, { status: 403 });

  const { creativeId } = await context.params;
  const creative = await prisma.adCreative.findUnique({ where: { id: creativeId }, include: { ad: { include: { brandPage: true } } } });
  const ad = creative?.ad;
  if (!ad?.externalAdId || !ad.brandPage?.name) return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });

  let creditsReserved = false;
  if (!isAdmin) {
    const credits = await checkAndConsumeQuota({ userId: user.id, plan, metric: "api_credits_monthly", amount: 5 });
    if (!credits.allowed) return NextResponse.json({ error: "API_CREDITS_EXCEEDED" }, { status: 403 });
    creditsReserved = true;
  }

  try {
    const country = ad.countries.find((code) => AD_COUNTRY_CODES.has(code)) || "ALL";
    const records = await runApifyActor({
      searchTerms: [ad.brandPage.name],
      country,
      adActiveStatus: "ALL",
      mediaType: "ALL",
      maxResults: REFRESH_RESULTS,
      maxCostUsd: 0.3,
      scrapeAdDetails: true,
      includeAboutPage: false
    });
    const match = records.find((record) => normalizeApifyAd(record)?.externalAdId === ad.externalAdId);
    if (!match || !normalizeApifyAd(match)?.creativeUrl) {
      if (creditsReserved) await refundQuota({ userId: user.id, metric: "api_credits_monthly", amount: 5 });
      return NextResponse.json({ error: "MEDIA_NOT_REFRESHED" }, { status: 404 });
    }
    await importApifyAds([match]);
    const fresh = await prisma.adCreative.findFirst({ where: { adId: ad.id }, orderBy: { position: "asc" }, select: { id: true, type: true, url: true, thumbnailUrl: true } });
    return NextResponse.json({ data: fresh });
  } catch (error) {
    if (creditsReserved) await refundQuota({ userId: user.id, metric: "api_credits_monthly", amount: 5 });
    const code = error instanceof Error && /^APIFY_[A-Z0-9_]+$/.test(error.message) ? error.message : "MEDIA_REFRESH_FAILED";
    return NextResponse.json({ error: code }, { status: code.endsWith("NOT_CONFIGURED") ? 503 : 502 });
  }
}
