import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { DashboardLayoutClient } from "./dashboard-layout-client";
import { BrandLogo } from "@/components/brand-logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false, nocache: true }
};

const nav: [string, string][] = [
  ["Ads", "/dashboard/ads"],
  ["Stores", "/dashboard/stores"],
  ["Store Tracker", "/dashboard/store-tracker"],
  ["Saved Ads", "/dashboard/saved-ads"],
  ["Account", "/dashboard/account"],
  ["TikTok Shop", "/dashboard/tiktok-shop"],
  ["Magic AI", "/dashboard/magic-ai"],
  ["Trends", "/dashboard/trends"],
  ["Ucuz Dönüşüm", "/dashboard/conversion-finder"],
  ["Brand Tracker", "/dashboard/brand-tracker"]
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardLayoutClient user={user} nav={nav}>
        {children}
      </DashboardLayoutClient>
    </div>
  );
}
