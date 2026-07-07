import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const ad = await prisma.ad.findUnique({ where: { id: params.id } });
  if (!ad) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await prisma.savedAd.upsert({
    where: { userId_adId: { userId: user.id, adId: params.id } },
    update: {},
    create: { userId: user.id, adId: params.id }
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  await prisma.savedAd.deleteMany({ where: { userId: user.id, adId: params.id } });
  return NextResponse.json({ ok: true });
}
