"use client";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckoutButton } from "@/components/checkout-button";
import { BrandLogo } from "@/components/brand-logo";
import { useT } from "@/lib/i18n";

export function PricingClient({ plans }: { plans: any[] }) {
  const t = useT();
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="mb-10 inline-flex"><BrandLogo /></a>
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black">{t("pricing.title")}</h1>
          <p className="mt-3 text-slate-600">{t("pricing.description")}</p>
        </div>
        <div className="grid gap-5 md:grid-cols-4">
          {plans.map((plan: any) => (
            <Card key={plan.code} className={plan.code === "STANDARD" ? "ring-2 ring-violet-600" : ""}>
              <div className="text-sm font-bold text-violet-700">{plan.code}</div>
              <h2 className="mt-2 text-2xl font-black">{plan.name}</h2>
              <div className="mt-4 text-4xl font-black">€{plan.monthlyPriceEur}<span className="text-sm font-medium text-slate-500">{t("pricing.perMonth")}</span></div>
              <ul className="mt-6 space-y-2 text-sm text-slate-600">
                <li>{t("pricing.adsPerDay")}: {String((plan.features as any).adsSearchDaily ?? t("pricing.unlimited"))}</li>
                <li>{t("pricing.storeTracker")}: {String((plan.features as any).trackedStores ?? t("pricing.unlimited"))}</li>
                <li>{t("pricing.savedAds")}: {String((plan.features as any).savedAds ?? t("pricing.unlimited"))}</li>
              </ul>
              {plan.code === "FREE" ? <LinkButton href="/register" className="mt-6 w-full">{t("pricing.startFree")}</LinkButton> : <CheckoutButton planCode={plan.code} />}
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}