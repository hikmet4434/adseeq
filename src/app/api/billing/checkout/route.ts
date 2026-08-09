import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { stripeClient, stripePriceFor } from "@/lib/stripe";
import { hizSiniriAsimi } from "@/lib/rate-limit";

const schema = z.object({ planCode: z.enum(["BASIC", "STANDARD", "PREMIUM"]), interval: z.enum(["monthly", "yearly"]).default("monthly") });

export async function POST(request: Request) {
  const limited = hizSiniriAsimi(request, "giris");
  if (limited) return limited;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  const plan = await prisma.plan.findUnique({ where: { code: parsed.data.planCode } });
  if (!plan || !plan.isActive) return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
  try {
    const stripe = stripeClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (!appUrl || !appUrl.startsWith("https://")) throw new Error("APP_URL_INVALID");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: stripePriceFor(plan.code, parsed.data.interval), quantity: 1 }],
      customer: user.subscription?.providerCustomerId || undefined,
      customer_email: user.subscription?.providerCustomerId ? undefined : user.email,
      client_reference_id: user.id,
      success_url: `${appUrl}/dashboard/account?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=canceled`,
      allow_promotion_codes: true,
      metadata: { userId: user.id, planCode: plan.code, billingInterval: parsed.data.interval },
      subscription_data: { metadata: { userId: user.id, planCode: plan.code, billingInterval: parsed.data.interval } }
    });
    await prisma.payment.upsert({
      where: { externalId: session.id },
      create: { userId: user.id, amountCents: parsed.data.interval === "yearly" ? (plan.yearlyPriceEur || plan.monthlyPriceEur * 12) * 100 : plan.monthlyPriceEur * 100, currency: "EUR", status: "PENDING", provider: "STRIPE", externalId: session.id, description: `${plan.name} ${parsed.data.interval}` },
      update: {}
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const code = error instanceof Error && /^(STRIPE_[A-Z0-9_]+|APP_URL_INVALID)$/.test(error.message) ? error.message : "CHECKOUT_FAILED";
    return NextResponse.json({ error: code }, { status: code.includes("NOT_CONFIGURED") ? 503 : 502 });
  }
}
