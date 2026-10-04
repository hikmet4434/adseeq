import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";
import { hizSiniriAsimi } from "@/lib/rate-limit";
import { META_DATE_PRESETS, classifyAccountAds, fetchAccountInsights, normalizeAdAccountId } from "@/lib/meta-account";
import { analyzeAccountAds } from "@/lib/openai-analysis";
import { rankWinners } from "@/lib/winner-score";

// Erişim anahtarı yalnızca bu istekte kullanılır; veritabanına ya da loglara yazılmaz.
const schema = z.object({
  adAccountId: z.string().trim().min(5).max(40),
  accessToken: z.string().trim().min(20).max(1000),
  datePreset: z.enum(META_DATE_PRESETS).default("last_30d"),
  withAi: z.boolean().default(false),
  niche: z.string().trim().max(80).optional()
});

export async function POST(request: Request) {
  const limited = hizSiniriAsimi(request, "arama");
  if (limited) return limited;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const adAccountId = normalizeAdAccountId(parsed.data.adAccountId);
  if (!adAccountId) return NextResponse.json({ error: "INVALID_AD_ACCOUNT" }, { status: 400 });

  let ads;
  try {
    ads = classifyAccountAds(await fetchAccountInsights(adAccountId, parsed.data.accessToken, parsed.data.datePreset));
  } catch (error) {
    const code = error instanceof Error && /^META_[A-Z0-9_]+$/.test(error.message) ? error.message : "META_REQUEST_FAILED";
    return NextResponse.json({ error: code }, { status: code === "META_TOKEN_INVALID" || code === "META_PERMISSION_DENIED" ? 401 : 502 });
  }

  let ai: { summary: string; insights: Array<{ title: string; action: string; confidence: number }> } | null = null;
  let aiError: string | null = null;
  if (parsed.data.withAi && ads.length) {
    try {
      const niche = parsed.data.niche;
      const competitorAds = await prisma.ad.findMany({
        where: {
          status: "ACTIVE",
          ...(niche ? { OR: [{ headline: { contains: niche, mode: "insensitive" } }, { primaryText: { contains: niche, mode: "insensitive" } }, { niche: { contains: niche, mode: "insensitive" } }] } : {})
        },
        include: { brandPage: { select: { name: true } } },
        orderBy: { daysRunning: "desc" },
        take: 200
      });
      const competitorWinners = rankWinners(competitorAds).slice(0, 10).map(({ ad, winner }) => ({
        brand: ad.brandPage?.name || null, headline: ad.headline, primaryText: ad.primaryText?.slice(0, 400) || null, daysRunning: ad.daysRunning, variantCount: winner.variantCount
      }));
      const result = await analyzeAccountAds({
        ads: ads.slice(0, 40).map((ad) => ({ name: ad.adName, campaign: ad.campaignName, spend: Math.round(ad.spend * 100) / 100, ctr: Math.round(ad.ctr * 100) / 100, conversions: ad.conversions, cpa: ad.cpa === null ? null : Math.round(ad.cpa * 100) / 100, roas: ad.roas === null ? null : Math.round(ad.roas * 100) / 100, verdict: ad.verdict })),
        competitorWinners
      });
      const { model, ...analysis } = result;
      ai = analysis;
      await prisma.aiAnalysis.create({ data: { userId: user.id, query: `meta-account:${adAccountId}`, provider: "openai", model, summary: analysis.summary, insights: analysis.insights } });
    } catch (error) {
      aiError = error instanceof Error && /^(OPENAI_[A-Z0-9_]+)$/.test(error.message) ? error.message : "AI_ANALYSIS_FAILED";
    }
  }

  return NextResponse.json({ data: { adAccountId, ads, ai, aiError } });
}
