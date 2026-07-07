import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return NextResponse.json({ data: await prisma.savedFolder.findMany({ where: { userId: user.id }, orderBy: { sortOrder: "asc" } }) });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await req.json();
  const folder = await prisma.savedFolder.create({ data: { userId: user.id, name: body.name, color: body.color } });
  return NextResponse.json({ data: folder });
}
