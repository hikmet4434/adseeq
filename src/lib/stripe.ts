import Stripe from "stripe";

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_NOT_CONFIGURED");
  return new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 });
}

export function stripePriceFor(planCode: string, interval: "monthly" | "yearly") {
  const key = `STRIPE_PRICE_${planCode}_${interval}`.toUpperCase();
  const price = process.env[key]?.trim();
  if (!price || !/^price_[a-zA-Z0-9]+$/.test(price)) throw new Error("STRIPE_PRICE_NOT_CONFIGURED");
  return price;
}
