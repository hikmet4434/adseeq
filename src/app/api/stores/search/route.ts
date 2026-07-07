import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const niche = url.searchParams.get("niche");
  const country = url.searchParams.get("country");
  const sort = url.searchParams.get("sort") || "revenue_desc";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));

  const where: Prisma.StoreWhereInput = {};
  if (niche) where.niche = { contains: niche, mode: "insensitive" };
  if (country) where.country = country;
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { domain: { contains: q, mode: "insensitive" } }, { niche: { contains: q, mode: "insensitive" } }];

  const orderBy: Prisma.StoreOrderByWithRelationInput = sort === "traffic_desc" ? { monthlyVisits: "desc" } : sort === "growth_desc" ? { monthlyVisitGrowth: "desc" } : { estRevenue30dMax: "desc" };

  const [total, rows] = await Promise.all([
    prisma.store.count({ where }),
    prisma.store.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: { products: { where: { isBestSeller: true }, take: 3 }, brandPages: { include: { _count: { select: { ads: true } } }, take: 1 } } })
  ]);
  return NextResponse.json({ data: rows, pagination: { page, limit, total } });
}
