import { prisma } from "@/lib/db";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckoutButton } from "@/components/checkout-button";
import { BrandLogo } from "@/components/brand-logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fiyatlandırma",
  description: "AdSeeQ Free, Basic, Standard ve Premium planlarının reklam arama, mağaza takip ve kayıt limitlerini karşılaştırın.",
  alternates: { canonical: "/pricing", languages: { "tr-TR": "/pricing" } },
  openGraph: {
    title: "AdSeeQ Fiyatlandırma",
    description: "İhtiyacınıza uygun reklam ve trend araştırma planını seçin.",
    url: "/pricing"
  }
};

export default async function PricingPage() {
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } }).catch(() => []);
  const fallback = [
    { code: "FREE", name: "Free", monthlyPriceEur: 0, features: { adsSearchDaily: 10, trackedStores: 0 } },
    { code: "BASIC", name: "Basic", monthlyPriceEur: 42, features: { adsSearchDaily: 100, trackedStores: 25 } },
    { code: "STANDARD", name: "Standard", monthlyPriceEur: 68, features: { adsSearchDaily: 500, trackedStores: 50 } },
    { code: "PREMIUM", name: "Premium", monthlyPriceEur: 212, features: { adsSearchDaily: 2000, trackedStores: 500 } }
  ];
  const rows = plans.length ? plans : fallback;
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <a href="/" className="mb-10 inline-flex"><BrandLogo /></a>
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black">Fiyatlandırma</h1>
          <p className="mt-3 text-slate-600">Kota tabanlı freemium model: arama, takip ve API kredileri planlara göre açılır.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-4">
          {rows.map((plan: any) => (
            <Card key={plan.code} className={plan.code === "STANDARD" ? "ring-2 ring-violet-600" : ""}>
              <div className="text-sm font-bold text-violet-700">{plan.code}</div>
              <h2 className="mt-2 text-2xl font-black">{plan.name}</h2>
              <div className="mt-4 text-4xl font-black">€{plan.monthlyPriceEur}<span className="text-sm font-medium text-slate-500">/ay</span></div>
              <ul className="mt-6 space-y-2 text-sm text-slate-600">
                <li>Ads arama/gün: {String((plan.features as any).adsSearchDaily ?? "Sınırsız")}</li>
                <li>Store tracker: {String((plan.features as any).trackedStores ?? "Sınırsız")}</li>
                <li>Saved ads: {String((plan.features as any).savedAds ?? "Sınırsız")}</li>
              </ul>
              {plan.code === "FREE" ? <LinkButton href="/register" className="mt-6 w-full">Ücretsiz başla</LinkButton> : <CheckoutButton planCode={plan.code} />}
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
