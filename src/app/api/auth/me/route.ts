import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/current-user";
import { planFromUser } from "@/lib/plans";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: planFromUser(user as never).code,
      creditBalance: user.creditBalance
    }
  });
}
