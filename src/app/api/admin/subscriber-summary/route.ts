import { getApiAdmin } from "@/lib/admin-api";
import { prisma } from "@/lib/db";
import { accountSummary, reportPeriod } from "@/lib/subscriber-summary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "private, no-store" };
export async function GET(request: Request) {
  try {
    if (!await getApiAdmin()) return Response.json({ error: "FORBIDDEN" }, { status: 403, headers });
    const params = new URL(request.url).searchParams;
    let period;
    try { period = reportPeriod(params.get("start"), params.get("end")); }
    catch { return Response.json({ error: "INVALID_REPORT_PERIOD" }, { status: 400, headers }); }
    const counts = await prisma.$transaction(async tx => ({
      total: await tx.user.count(), fresh: await tx.user.count({ where: { createdAt: { gte: new Date(period.start), lt: new Date(period.end) } } }),
    }), { isolationLevel: "RepeatableRead" });
    return Response.json(accountSummary("adseeq", period, counts.total, counts.fresh), { headers });
  } catch { return Response.json({ error: "REPORT_SOURCE_UNAVAILABLE" }, { status: 503, headers }); }
}
