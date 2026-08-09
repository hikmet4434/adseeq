import { NextResponse } from "next/server";
import Stripe from "stripe";
import { PaymentStatus, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";

function status(value: Stripe.Subscription.Status): SubscriptionStatus {
  if (value === "active") return SubscriptionStatus.ACTIVE;
  if (value === "trialing") return SubscriptionStatus.TRIALING;
  if (value === "past_due" || value === "unpaid" || value === "incomplete") return SubscriptionStatus.PAST_DUE;
  if (value === "canceled" || value === "incomplete_expired") return SubscriptionStatus.CANCELED;
  return SubscriptionStatus.EXPIRED;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  const planCode = subscription.metadata.planCode as "BASIC" | "STANDARD" | "PREMIUM" | undefined;
  if (!userId || !planCode) return;
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan) return;
  const item = subscription.items.data[0];
  const start = item?.current_period_start ? new Date(item.current_period_start * 1000) : null;
  const end = item?.current_period_end ? new Date(item.current_period_end * 1000) : null;
  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, planId: plan.id, status: status(subscription.status), billingInterval: subscription.metadata.billingInterval || "monthly", currentPeriodStart: start, currentPeriodEnd: end, cancelAtPeriodEnd: subscription.cancel_at_period_end, provider: "STRIPE", providerCustomerId: String(subscription.customer), providerSubscriptionId: subscription.id },
    update: { planId: plan.id, status: status(subscription.status), billingInterval: subscription.metadata.billingInterval || "monthly", currentPeriodStart: start, currentPeriodEnd: end, cancelAtPeriodEnd: subscription.cancel_at_period_end, provider: "STRIPE", providerCustomerId: String(subscription.customer), providerSubscriptionId: subscription.id }
  });
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "WEBHOOK_NOT_CONFIGURED" }, { status: 503 });
  const raw = await request.text();
  let event: Stripe.Event;
  try { event = stripeClient().webhooks.constructEvent(raw, signature, secret, 300); }
  catch { return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 400 }); }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId || session.client_reference_id;
    if (userId) {
      await prisma.payment.upsert({
        where: { externalId: session.id },
        create: { userId, amountCents: session.amount_total || 0, currency: (session.currency || "eur").toUpperCase(), status: PaymentStatus.PAID, provider: "STRIPE", externalId: session.id, description: `Stripe ${session.metadata?.planCode || "subscription"}`, paidAt: new Date() },
        update: { status: PaymentStatus.PAID, amountCents: session.amount_total || 0, currency: (session.currency || "eur").toUpperCase(), paidAt: new Date() }
      });
      if (typeof session.subscription === "string") await syncSubscription(await stripeClient().subscriptions.retrieve(session.subscription));
    }
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted" || event.type === "customer.subscription.created") await syncSubscription(event.data.object);
  return NextResponse.json({ received: true });
}
