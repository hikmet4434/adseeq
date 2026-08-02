import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiAdmin, requestAuditContext } from "@/lib/admin-api";
import { importApifyAds, runApifyActor } from "@/lib/apify";
import { prisma } from "@/lib/db";

const schema = z.object({
  searchTerms: z.array(z.string().trim().min(2).max(100)).min(1).max(10),
  country: z.string().trim().toUpperCase().refine((value) => value === "ALL" || /^[A-Z]{2}$/.test(value)),
  adActiveStatus: z.enum(["ACTIVE", "INACTIVE", "ALL"]).default("ACTIVE"),
  mediaType: z.enum(["ALL", "IMAGE", "VIDEO", "MEME", "NONE"]).default("ALL"),
  maxResults: z.coerce.number().int().min(1).max(1000).default(100),
  scrapeAdDetails: z.boolean().default(true),
  includeAboutPage: z.boolean().default(false),
  maxCostUsd: z.coerce.number().min(0.1).max(10).default(1)
});

export async function POST(request: Request) {
  const actor = await getApiAdmin();
  if (!actor) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const auditContext = requestAuditContext(request);
  const job = await prisma.ingestJob.create({
    data: { source: "apify", type: "meta-ads-library", status: "RUNNING", startedAt: new Date(), metadata: { searchTerms: parsed.data.searchTerms, country: parsed.data.country, maxResults: parsed.data.maxResults } }
  });
  try {
    const records = await runApifyActor(parsed.data);
    const result = await importApifyAds(records);
    await prisma.$transaction([
      prisma.ingestJob.update({ where: { id: job.id }, data: { status: "COMPLETED", finishedAt: new Date(), recordsImported: result.imported, recordsFailed: result.failed, metadata: { searchTerms: parsed.data.searchTerms, country: parsed.data.country, received: records.length } } }),
      prisma.adminAuditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action: "APIFY_INGEST_COMPLETED", targetType: "IngestJob", targetId: job.id, summary: `${result.imported} Meta reklamı Apify üzerinden işlendi.`, details: { ...result, received: records.length, searchTerms: parsed.data.searchTerms, country: parsed.data.country }, ...auditContext } })
    ]);
    return NextResponse.json({ ok: true, jobId: job.id, ...result, received: records.length });
  } catch (error) {
    const code = error instanceof Error && /^APIFY_[A-Z0-9_]+$/.test(error.message) ? error.message : "APIFY_INGEST_FAILED";
    await prisma.$transaction([
      prisma.ingestJob.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), errorMessage: code } }),
      prisma.adminAuditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, action: "APIFY_INGEST_FAILED", targetType: "IngestJob", targetId: job.id, summary: `Apify ingest başarısız: ${code}`, details: { searchTerms: parsed.data.searchTerms, country: parsed.data.country }, ...auditContext } })
    ]);
    return NextResponse.json({ error: code }, { status: code === "APIFY_NOT_CONFIGURED" ? 503 : 502 });
  }
}

