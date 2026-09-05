import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { DashboardMobileNav } from "@/components/dashboard-mobile-nav";
import { BrandLogo } from "@/components/brand-logo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false, nocache: true }
};

const nav = [
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
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/dashboard/ads"><BrandLogo markClassName="h-8 w-8" /></Link>
          <DashboardMobileNav isAdmin={user.role === "ADMIN"} />
          <nav className="hidden gap-1 lg:flex">
            {nav.map(([label, href]) => (
              <Link key={label} href={href} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                {label}
              </Link>
            ))}
            {user.role === "ADMIN" && <Link href="/dashboard/admin" className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-black text-violet-700 hover:bg-violet-100">Admin</Link>}
          </nav>
          <div className="flex items-center gap-3">
            {user.role !== "ADMIN" && <Link href="/pricing" className="hidden rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white sm:block">Upgrade</Link>}
            <div className="text-right text-sm">
              <div className="font-bold">{user.name || user.email}</div>
              <div className="text-xs text-slate-500">{user.subscription?.plan.name}</div>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
