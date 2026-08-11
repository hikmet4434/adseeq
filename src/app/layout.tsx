import type { Metadata } from "next";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: "AdSeeQ — Reklam ve Trend Zekâsı",
    template: "%s | AdSeeQ"
  },
  description: SITE_DESCRIPTION,
  keywords: ["reklam kütüphanesi", "Meta Ads", "TikTok Shop", "trend analizi", "marka takibi", "reklam zekâsı"],
  alternates: {
    canonical: "/",
    languages: { "tr-TR": "/" }
  },
  openGraph: {
    title: "AdSeeQ — Kazanan reklamları ve trendleri keşfedin",
    description: "Meta Ads, TikTok Shop, Magic AI Trends ve Brand Tracker tek panelde.",
    url: "/",
    siteName: "AdSeeQ",
    locale: "tr_TR",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "AdSeeQ — Reklam ve Trend Zekâsı",
    description: "Kazanan reklamları, ürünleri ve rakip marka hareketlerini keşfedin."
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
