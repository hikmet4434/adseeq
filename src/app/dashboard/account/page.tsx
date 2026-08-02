import { requireUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";

export default async function AccountPage() {
  const user = await requireUser();
  return <div><h1 className="mb-6 text-3xl font-black">Hesabım</h1><div className="grid gap-4 md:grid-cols-3"><Card><div className="text-sm text-slate-500">Hesap</div><div className="mt-2 font-black">{user.email}</div><div className="mt-1 text-xs text-slate-400">Yetki: {user.role}</div></Card><Card><div className="text-sm text-slate-500">Plan</div><div className="mt-2 text-2xl font-black">{user.subscription?.plan.name || "—"}</div><div className="mt-1 text-xs text-slate-400">{user.subscription?.status || "Abonelik yok"}</div></Card><Card><div className="text-sm text-slate-500">Kredi bakiyesi</div><div className="mt-2 text-3xl font-black">{user.creditBalance.toLocaleString("tr-TR")}</div></Card></div></div>;
}
