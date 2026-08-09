import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await context.params;
  await prisma.trackedBrand.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ ok: true });
}
