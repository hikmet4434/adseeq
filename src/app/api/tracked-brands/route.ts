import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";
import { getFeatureLimit, planFromUser } from "@/lib/plans";

const schema = z.object({ brandPageId: z.string().min(1) });

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const data = await prisma.trackedBrand.findMany({
    where: { userId: user.id },
    include: { brandPage: { include: { _count: { select: { ads: true } } } } },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const brand = await prisma.brandPage.findUnique({ where: { id: parsed.data.brandPageId }, select: { id: true } });
  if (!brand) return NextResponse.json({ error: "BRAND_NOT_FOUND" }, { status: 404 });

  const existing = await prisma.trackedBrand.findUnique({
    where: { userId_brandPageId: { userId: user.id, brandPageId: brand.id } }
  });
  if (existing) return NextResponse.json({ data: existing });

  const limit = getFeatureLimit(planFromUser(user as any), "followed_brands");
  const count = await prisma.trackedBrand.count({ where: { userId: user.id } });
  if (limit !== null && count >= limit) {
    return NextResponse.json({ error: "FOLLOWED_BRAND_LIMIT_EXCEEDED", upgradeRequired: true }, { status: 403 });
  }

  const data = await prisma.trackedBrand.create({ data: { userId: user.id, brandPageId: brand.id } });
  return NextResponse.json({ data });
}
