import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { StoresClient } from "./stores-client";

export default async function StoresPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q?.trim();
  const niche = resolvedSearchParams.niche;
  const where: Prisma.StoreWhereInput = {};
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { domain: { contains: q, mode: "insensitive" } }, { niche: { contains: q, mode: "insensitive" } }];
  if (niche) where.niche = { contains: niche, mode: "insensitive" };
  const stores = await prisma.store.findMany({ where, include: { products: { where: { isBestSeller: true }, take: 2 }, brandPages: { include: { _count: { select: { ads: true } } }, take: 1 } }, orderBy: { estRevenue30dMax: "desc" }, take: 50 });
  return <StoresClient q={q} niche={niche} stores={stores} />;
}
