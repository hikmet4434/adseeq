import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/current-user";

export async function POST() {
  await requireAdmin();
  return NextResponse.json({ ok: true, message: "Demo seed komut satırından çalışır: npm run db:seed" });
}
