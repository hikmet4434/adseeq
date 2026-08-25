import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { MagicAiClient } from "./magic-ai-client";

export default async function MagicAIPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser();
  const q = (await searchParams).q?.trim();
  const where: Prisma.AdWhereInput = q ? { OR: [{ headline: { contains: q, mode: "insensitive" } }, { primaryText: { contains: q, mode: "insensitive" } }, { brandPage: { name: { contains: q, mode: "insensitive" } } }] } : {};
  const [ads, analyses] = await Promise.all([
    prisma.ad.findMany({ where, include: { brandPage: true, creatives: { take: 1 } }, orderBy: [{ daysRunning: "desc" }, { updatedAt: "desc" }], take: 18 }),
    prisma.aiAnalysis.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 })
  ]);

  return <MagicAiClient q={q} ads={ads} analyses={analyses} />;
}
