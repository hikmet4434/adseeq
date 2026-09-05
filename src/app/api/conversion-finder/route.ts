import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { planFromUser } from "@/lib/plans";
import { hizSiniriAsimi } from "@/lib/rate-limit";
import { AD_COUNTRY_CODES } from "@/lib/countries";
import { loadConversionRanking, maskRankingForPlan } from "@/lib/conversion-finder-data";

export async function GET(request: Request) {
  const limited = hizSiniriAsimi(request, "arama");
  if (limited) return limited;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(request.url);
  const country = (url.searchParams.get("country") || "TR").toUpperCase();
  if (!AD_COUNTRY_CODES.has(country) || country === "ALL") return NextResponse.json({ error: "INVALID_COUNTRY" }, { status: 400 });
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 100)));

  const ranking = await loadConversionRanking(country, limit);
  const plan = planFromUser(user as never);
  return NextResponse.json({
    country,
    adCount: ranking.adCount,
    productCount: ranking.productCount,
    disclaimer: "Meta dönüşüm maliyetini yayınlamaz; endeks herkese açık sinyallerden türetilen bir tahmindir.",
    data: maskRankingForPlan(ranking.results, plan?.code, user.role === "ADMIN")
  });
}
