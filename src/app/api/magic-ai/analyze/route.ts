import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { currentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { analyzeCreatives } from "@/lib/openai-analysis";
import { hizSiniriAsimi } from "@/lib/rate-limit";

const schema = z.object({ query: z.string().trim().max(100).optional() });

export async function POST(request: Request) {
  const limited = hizSiniriAsimi(request, "arama");
  if (limited) return limited;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const q = parsed.data.query;
  const where: Prisma.AdWhereInput = q ? { OR: [{ headline: { contains: q, mode: "insensitive" } }, { primaryText: { contains: q, mode: "insensitive" } }, { brandPage: { name: { contains: q, mode: "insensitive" } } }] } : {};
  const ads = await prisma.ad.findMany({ where, include: { brandPage: true }, orderBy: [{ daysRunning: "desc" }, { updatedAt: "desc" }], take: 20 });
  if (!ads.length) return NextResponse.json({ error: "NO_ADS_TO_ANALYZE" }, { status: 404 });
  try {
    const result = await analyzeCreatives(q, ads.map((ad) => ({ headline: ad.headline, primaryText: ad.primaryText, mediaType: ad.mediaType, daysRunning: ad.daysRunning, status: ad.status, brand: ad.brandPage?.name || null })));
    const saved = await prisma.aiAnalysis.create({ data: { userId: user.id, query: q, provider: "openai", model: result.model, summary: result.summary, insights: result.insights } });
    return NextResponse.json({ data: saved });
  } catch (error) {
    const code = error instanceof Error && /^(OPENAI_[A-Z0-9_]+)$/.test(error.message) ? error.message : "AI_ANALYSIS_FAILED";
    return NextResponse.json({ error: code }, { status: code === "OPENAI_NOT_CONFIGURED" ? 503 : 502 });
  }
}
