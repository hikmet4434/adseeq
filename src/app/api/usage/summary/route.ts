import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { usageSummary } from "@/lib/quota";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return NextResponse.json({ data: await usageSummary(user.id) });
}
