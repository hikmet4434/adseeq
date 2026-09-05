"use client";
import Link from "next/link";
import { DashboardMobileNav } from "@/components/dashboard-mobile-nav";
import { BrandLogo } from "@/components/brand-logo";
import { useT } from "@/lib/i18n";

export function DashboardLayoutClient({ user, nav, children }: { 
  user: any; 
  nav: [string, string][];
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <>
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
            {user.role === "ADMIN" && <Link href="/dashboard/admin" className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-black text-violet-700 hover:bg-violet-100">{t("nav.admin")}</Link>}
          </nav>
          <div className="flex items-center gap-3">
            {user.role !== "ADMIN" && <Link href="/pricing" className="hidden rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white sm:block">{t("nav.upgrade")}</Link>}
            <div className="text-right text-sm">
              <div className="font-bold">{user.name || user.email}</div>
              <div className="text-xs text-slate-500">{user.subscription?.plan.name}</div>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </>
  );
}