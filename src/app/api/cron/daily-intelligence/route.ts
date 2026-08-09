import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getApiAdmin } from "@/lib/admin-api";
import { captureTrendSnapshot, createBrandAlerts } from "@/lib/trend-snapshots";

export async function POST(request: Request) {
  const configured = process.env.CRON_SECRET?.trim();
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const authorizedBySecret = Boolean(configured && bearer && bearer.length === configured.length && timingSafeEqual(Buffer.from(bearer), Buffer.from(configured)));
  if (!authorizedBySecret && !(await getApiAdmin())) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const snapshot = await captureTrendSnapshot();
  const alertsCreated = await createBrandAlerts();
  return NextResponse.json({ ok: true, snapshotDate: snapshot.date, alertsCreated });
}
