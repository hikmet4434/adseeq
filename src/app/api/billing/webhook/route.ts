import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { PaymentStatus, PlanCode, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";

function status(value: Stripe.Subscription.Status): SubscriptionStatus {
  if (value === "active") return SubscriptionStatus.ACTIVE;
  if (value === "trialing") return SubscriptionStatus.TRIALING;
  if (value === "past_due" || value === "unpaid" || value === "incomplete") return SubscriptionStatus.PAST_DUE;
  if (value === "canceled" || value === "incomplete_expired") return SubscriptionStatus.CANCELED;
  return SubscriptionStatus.EXPIRED;
}

function isEntitledStripeStatus(value: Stripe.Subscription.Status) {
  return value === "active" || value === "trialing";
}

async function syncSubscription(subscription: Stripe.Subscription, forceCanceled = false) {
  const effectiveStatus: Stripe.Subscription.Status = forceCanceled ? "canceled" : subscription.status;
  // Incomplete checkouts have not been paid yet; never grant a paid plan or clobber active state.
  if (effectiveStatus === "incomplete") return;

  let userId: string | undefined = subscription.metadata?.userId;
  if (!userId) {
    const existing = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: subscription.id },
      select: { userId: true }
    });
    userId = existing?.userId;
  }
  if (!userId) return;

  const mappedStatus = status(effectiveStatus);
  const item = subscription.items?.data?.[0];
  const startUnix = item?.current_period_start ?? (subscription as unknown as { current_period_start?: number }).current_period_start;
  const endUnix = item?.current_period_end ?? (subscription as unknown as { current_period_end?: number }).current_period_end;
  const start = startUnix ? new Date(startUnix * 1000) : null;
  const end = endUnix ? new Date(endUnix * 1000) : null;
  const baseFields = {
    status: mappedStatus,
    billingInterval: subscription.metadata?.billingInterval || "monthly",
    currentPeriodStart: start,
    currentPeriodEnd: end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    provider: "STRIPE",
    providerCustomerId: String(subscription.customer),
    providerSubscriptionId: subscription.id
  };

  if (isEntitledStripeStatus(effectiveStatus)) {
    const planCode = subscription.metadata?.planCode as "BASIC" | "STANDARD" | "PREMIUM" | undefined;
    if (!planCode || !["BASIC", "STANDARD", "PREMIUM"].includes(planCode)) return;
    const plan = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) return;
    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, planId: plan.id, ...baseFields },
      update: { planId: plan.id, ...baseFields }
    });
    return;
  }

  const freePlan = await prisma.plan.findUnique({ where: { code: PlanCode.FREE } });
  if (!freePlan) {
    await prisma.subscription.updateMany({
      where: { userId },
      data: baseFields
    });
    return;
  }

  await prisma.subscription.upsert({
    where: { userId },
    create: { userId, planId: freePlan.id, ...baseFields },
    update: { planId: freePlan.id, ...baseFields }
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

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId || session.client_reference_id;
    if (userId) {
      const isPaid = session.payment_status === "paid";
      const amountCents = session.amount_total || 0;
      const currency = (session.currency || "eur").toUpperCase();
      const description = `Stripe ${session.metadata?.planCode || "subscription"}`;
      await prisma.payment.upsert({
        where: { externalId: session.id },
        create: {
          userId,
          amountCents,
          currency,
          status: isPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
          provider: "STRIPE",
          externalId: session.id,
          description,
          paidAt: isPaid ? new Date() : null
        },
        update: isPaid
          ? { status: PaymentStatus.PAID, amountCents, currency, paidAt: new Date() }
          : { amountCents, currency }
      });
      if (isPaid && typeof session.subscription === "string") {
        await syncSubscription(await stripeClient().subscriptions.retrieve(session.subscription));
      }
    }
  }
  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId || session.client_reference_id;
    if (userId) {
      await prisma.payment.upsert({
        where: { externalId: session.id },
        create: {
          userId,
          amountCents: session.amount_total || 0,
          currency: (session.currency || "eur").toUpperCase(),
          status: PaymentStatus.FAILED,
          provider: "STRIPE",
          externalId: session.id,
          description: `Stripe ${session.metadata?.planCode || "subscription"}`
        },
        update: { status: PaymentStatus.FAILED }
      });
    }
  }
  if (
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.created"
  ) {
    await syncSubscription(event.data.object as Stripe.Subscription, event.type === "customer.subscription.deleted");
  }
  return NextResponse.json({ received: true });
}
