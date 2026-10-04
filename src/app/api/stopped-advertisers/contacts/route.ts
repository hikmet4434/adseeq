import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth/current-user";
import { planFromUser } from "@/lib/plans";
import { hizSiniriAsimi } from "@/lib/rate-limit";
import { findContacts } from "@/lib/contact-finder";
import { landingHost } from "@/lib/stopped-advertisers";

const schema = z.object({ brandPageIds: z.array(z.string().min(1).max(40)).min(1).max(10), force: z.boolean().default(false) });
const RECHECK_AFTER_MS = 7 * 86_400_000;

async function websiteFor(brandPageId: string, websiteDomain: string | null) {
  if (websiteDomain) return websiteDomain;
  const ads = await prisma.ad.findMany({ where: { brandPageId, landingUrl: { not: null } }, select: { landingUrl: true }, take: 200 });
  const counts = new Map<string, number>();
  for (const ad of ads) {
    const host = landingHost(ad.landingUrl);
    if (host) counts.set(host, (counts.get(host) || 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || null;
}

export async function POST(request: Request) {
  const limited = hizSiniriAsimi(request, "arama");
  if (limited) return limited;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const plan = planFromUser(user as never);
  if (user.role !== "ADMIN" && (!plan?.code || plan.code === "FREE")) return NextResponse.json({ error: "PLAN_REQUIRED" }, { status: 402 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const brands = await prisma.brandPage.findMany({ where: { id: { in: parsed.data.brandPageIds } } });
  const results = [];
  // Siteler sırayla taranır: aynı anda çok sayıda dış istek atmamak ve Apify bütçesini korumak için.
  for (const brand of brands) {
    const fresh = brand.contactCheckedAt && Date.now() - brand.contactCheckedAt.getTime() < RECHECK_AFTER_MS;
    if (fresh && !parsed.data.force) {
      results.push({ brandPageId: brand.id, website: brand.websiteDomain, emails: brand.contactEmails, phones: brand.contactPhones, socials: brand.contactSocials, source: brand.contactSource, cached: true });
      continue;
    }
    const website = await websiteFor(brand.id, brand.websiteDomain);
    if (!website) {
      await prisma.brandPage.update({ where: { id: brand.id }, data: { contactCheckedAt: new Date(), contactSource: "no-website" } });
      results.push({ brandPageId: brand.id, website: null, emails: [], phones: [], socials: [], source: "no-website", cached: false });
      continue;
    }
    const found = await findContacts(website);
    await prisma.brandPage.update({
      where: { id: brand.id },
      data: {
        websiteDomain: brand.websiteDomain || website,
        contactEmails: found.emails,
        contactPhones: found.phones,
        contactSocials: found.socials,
        contactSource: found.source,
        contactCheckedAt: new Date()
      }
    });
    results.push({ brandPageId: brand.id, website, emails: found.emails, phones: found.phones, socials: found.socials, source: found.source, cached: false });
  }
  return NextResponse.json({ data: results });
}
