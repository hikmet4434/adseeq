import { NextResponse } from "next/server";
import { getApiAdmin } from "@/lib/admin-api";

export async function POST() {
  const admin = await getApiAdmin();
  if (!admin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  return NextResponse.json({ ok: true, message: "Demo seed komut satırından çalışır: npm run db:seed" });
}
