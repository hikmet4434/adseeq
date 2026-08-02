import Link from "next/link";

const links = [
  ["Genel Bakış", "/dashboard/admin"],
  ["Kullanıcılar", "/dashboard/admin/users"],
  ["Ödemeler", "/dashboard/admin/payments"],
  ["Log Merkezi", "/dashboard/admin/logs"],
  ["Veri İşleri", "/dashboard/admin/data"]
];

export function AdminNav() {
  return (
    <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {links.map(([label, href]) => (
        <Link key={href} href={href} className="rounded-xl px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700">
          {label}
        </Link>
      ))}
    </div>
  );
}
