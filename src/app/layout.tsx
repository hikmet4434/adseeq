import type { Metadata } from "next";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: "AdSeeQ",
  title: {
    default: "AdSeeQ — Reklam ve Trend Zekâsı",
    template: "%s | AdSeeQ"
  },
  description: "Meta reklamlarını, TikTok Shop ürünlerini, yükselen trendleri ve rakip markaları yapay zekâ ile tek panelden keşfedin.",
  keywords: ["reklam kütüphanesi", "Meta Ads", "TikTok Shop", "trend analizi", "marka takibi", "reklam zekâsı"],
  alternates: { canonical: "/" },
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
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
