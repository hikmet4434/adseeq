"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

const links: Array<[string, string]> = [
  ["adminNav.overview", "/dashboard/admin"],
  ["adminNav.users", "/dashboard/admin/users"],
  ["adminNav.payments", "/dashboard/admin/payments"],
  ["adminNav.logs", "/dashboard/admin/logs"],
  ["adminNav.data", "/dashboard/admin/data"]
];

export function AdminNav() {
  const t = useT();
  return (
    <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {links.map(([key, href]) => (
        <Link key={href} href={href} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700">
          {t(key)}
        </Link>
      ))}
    </div>
  );
}
