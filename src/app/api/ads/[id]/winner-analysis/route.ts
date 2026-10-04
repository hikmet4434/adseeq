import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";
import { planFromUser } from "@/lib/plans";
import { hizSiniriAsimi } from "@/lib/rate-limit";
import { analyzeWinningAd } from "@/lib/openai-analysis";
import { scoreWinner, variantKey } from "@/lib/winner-score";
import { LandingPageSummary, fetchPublicPage, summarizeLandingPage } from "@/lib/web-page";

const schema = z.object({ targetMarket: z.string().trim().max(80).optional() });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const limited = hizSiniriAsimi(request, "arama");
  if (limited) return limited;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const plan = planFromUser(user as never);
  if (user.role !== "ADMIN" && (!plan?.code || plan.code === "FREE")) return NextResponse.json({ error: "PLAN_REQUIRED" }, { status: 402 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const { id } = await context.params;
  const ad = await prisma.ad.findUnique({ where: { id }, include: { brandPage: true } });
  if (!ad) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const key = variantKey(ad);
  const siblings = ad.brandPageId && key
    ? await prisma.ad.findMany({ where: { brandPageId: ad.brandPageId }, select: { brandPageId: true, headline: true, primaryText: true }, take: 500 })
    : [];
  const familySize = key ? siblings.filter((sibling) => variantKey(sibling) === key).length : 1;
  const winner = scoreWinner(ad, familySize);

  // Hedef sayfa açılamazsa analiz yine yapılır; sadece sayfa yorumu boş kalır.
  let landingPage: LandingPageSummary | null = null;
  let landingError: string | null = null;
  if (ad.landingUrl && /^https?:\/\//i.test(ad.landingUrl)) {
    try { landingPage = summarizeLandingPage(await fetchPublicPage(ad.landingUrl)); }
    catch (error) { landingError = error instanceof Error ? error.message : "PAGE_FETCH_FAILED"; }
  }

  try {
    const result = await analyzeWinningAd({
      brand: ad.brandPage?.name || null,
      headline: ad.headline,
      primaryText: ad.primaryText,
      description: ad.description,
      ctaText: ad.ctaText,
      landingUrl: ad.landingUrl,
      mediaType: ad.mediaType,
      daysRunning: ad.daysRunning,
      status: ad.status,
      variantCount: winner.variantCount,
      platforms: winner.platforms,
      countries: ad.countries,
      winnerScore: winner.score,
      targetMarket: parsed.data.targetMarket || null,
      landingPage: landingPage && { url: landingPage.url, title: landingPage.title, description: landingPage.description, headings: landingPage.headings, ctas: landingPage.ctas, prices: landingPage.prices, offers: landingPage.offers, trustSignals: landingPage.trustSignals, excerpt: landingPage.excerpt }
    });
    const { model, ...analysis } = result;
    await prisma.aiAnalysis.create({ data: { userId: user.id, query: `winner:${ad.id}`, provider: "openai", model, summary: analysis.verdict, insights: analysis as never } });
    return NextResponse.json({ data: { winner, analysis, landingPage: landingPage && { ...landingPage, excerpt: undefined }, landingError } });
  } catch (error) {
    const code = error instanceof Error && /^(OPENAI_[A-Z0-9_]+)$/.test(error.message) ? error.message : "AI_ANALYSIS_FAILED";
    return NextResponse.json({ error: code }, { status: code === "OPENAI_NOT_CONFIGURED" ? 503 : 502 });
  }
}
