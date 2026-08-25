import { prisma } from "@/lib/db";
import { PricingClient } from "./pricing-client";
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
  return <PricingClient plans={rows} />;
}
