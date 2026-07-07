import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";
import { getFeatureLimit, planFromUser } from "@/lib/plans";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const data = await prisma.trackedStore.findMany({ where: { userId: user.id }, include: { store: { include: { products: { where: { isBestSeller: true }, take: 3 } } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const plan = planFromUser(user as any);
  const limit = getFeatureLimit(plan as any, "tracked_stores");
  const count = await prisma.trackedStore.count({ where: { userId: user.id } });
  if (limit !== null && count >= limit) return NextResponse.json({ error: "TRACKED_STORE_LIMIT_EXCEEDED", upgradeRequired: true }, { status: 403 });
  const body = await req.json();
  const domain = String(body.domain || "").replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
  const store = await prisma.store.findUnique({ where: { domain } });
  if (!store) return NextResponse.json({ error: "STORE_NOT_FOUND" }, { status: 404 });
  const row = await prisma.trackedStore.upsert({ where: { userId_storeId: { userId: user.id, storeId: store.id } }, update: {}, create: { userId: user.id, storeId: store.id } });
  return NextResponse.json({ data: row });
}
