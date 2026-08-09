"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const items = [
  ["Ads", "/dashboard/ads"], ["Stores", "/dashboard/stores"], ["Store Tracker", "/dashboard/store-tracker"],
  ["Saved Ads", "/dashboard/saved-ads"], ["TikTok Shop", "/dashboard/tiktok-shop"], ["Magic AI", "/dashboard/magic-ai"],
  ["Trends", "/dashboard/trends"], ["Brand Tracker", "/dashboard/brand-tracker"], ["Account", "/dashboard/account"]
];

export function DashboardMobileNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return <div className="lg:hidden"><button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-dashboard-nav" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">{open ? "Kapat" : "Menü"}</button>{open && <nav id="mobile-dashboard-nav" className="absolute inset-x-4 top-[72px] grid gap-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">{items.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`rounded-xl px-3 py-2 text-sm font-semibold ${pathname === href ? "bg-violet-50 text-violet-700" : "text-slate-700 hover:bg-slate-50"}`}>{label}</Link>)}{isAdmin && <Link href="/dashboard/admin" onClick={() => setOpen(false)} className="rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white">Admin</Link>}</nav>}</div>;
}
