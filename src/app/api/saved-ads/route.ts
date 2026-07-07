import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const folderId = new URL(req.url).searchParams.get("folderId");
  const data = await prisma.savedAd.findMany({
    where: { userId: user.id, ...(folderId ? { folderId } : {}) },
    orderBy: { createdAt: "desc" },
    include: { folder: true, ad: { include: { brandPage: true, creatives: { take: 1 } } } }
  });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await req.json();
  const saved = await prisma.savedAd.upsert({
    where: { userId_adId: { userId: user.id, adId: body.adId } },
    update: { folderId: body.folderId || null, note: body.note },
    create: { userId: user.id, adId: body.adId, folderId: body.folderId || null, note: body.note }
  });
  return NextResponse.json({ data: saved });
}
