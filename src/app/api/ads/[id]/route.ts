import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";
import { maskAdForPlan } from "@/lib/locked-response";
import { planFromUser } from "@/lib/plans";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const ad = await prisma.ad.findUnique({
    where: { id: params.id },
    include: { brandPage: true, creatives: true, aiTags: true, countryStats: true }
  });
  if (!ad) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const plan = planFromUser(user as any);
  return NextResponse.json({ data: maskAdForPlan(ad as any, plan?.code) });
}
