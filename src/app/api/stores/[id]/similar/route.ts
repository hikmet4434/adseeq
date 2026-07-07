import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const store = await prisma.store.findUnique({ where: { id: params.id } });
  if (!store) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const data = await prisma.store.findMany({ where: { id: { not: params.id }, niche: store.niche }, take: 20, orderBy: { monthlyVisits: "desc" } });
  return NextResponse.json({ data });
}
