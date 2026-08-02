import { Prisma, UserRole } from "@prisma/client";
import { AdminNav } from "@/components/admin/admin-nav";
import { CreditAdjustForm, PlanForm, RoleForm } from "@/components/admin/admin-actions";
import { Card } from "@/components/ui/card";
import { isConfiguredAdminEmail } from "@/lib/admin-emails";
import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const query = await searchParams;
  const q = query.q?.trim();
  const role = query.role === "ADMIN" || query.role === "USER" ? query.role as UserRole : undefined;
  const where: Prisma.UserWhereInput = { role };
  if (q) where.OR = [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }];
  const [users, plans] = await Promise.all([
    prisma.user.findMany({ where, include: { subscription: { include: { plan: true } }, creditTransactions: { orderBy: { createdAt: "desc" }, take: 3 } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })
  ]);

  return (
    <div>
      <div className="mb-6"><h1 className="text-3xl font-black">Kullanıcı Yönetimi</h1><p className="mt-1 text-slate-500">Yetki, plan ve kredi bakiyelerini tek yerden yönetin.</p></div>
      <AdminNav />
      <form className="mb-5 grid gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_120px]">
        <input name="q" defaultValue={q} placeholder="E-posta veya ad ara" className="rounded-xl border border-slate-200 px-4 py-3" />
        <select name="role" defaultValue={role || ""} className="rounded-xl border border-slate-200 bg-white px-4 py-3"><option value="">Tüm yetkiler</option><option>ADMIN</option><option>USER</option></select>
        <button className="rounded-xl bg-slate-950 px-4 py-3 font-bold text-white">Filtrele</button>
      </form>
      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black">{user.name || user.email}</h2><span className={`rounded-full px-2 py-1 text-xs font-bold ${user.role === "ADMIN" ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-600"}`}>{user.role}</span></div><div className="text-sm text-slate-500">{user.email} · {user.googleId ? "Google bağlı" : "E-posta hesabı"}</div><div className="mt-1 text-xs text-slate-400">Son giriş: {user.lastLoginAt?.toLocaleString("tr-TR") || "—"} · Kayıt: {user.createdAt.toLocaleDateString("tr-TR")}</div></div>
              <div className="text-right"><div className="text-sm text-slate-500">Plan</div><div className="font-black">{user.subscription?.plan.code || "YOK"}</div></div>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-slate-100 p-3"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Yetki ve plan</div><RoleForm userId={user.id} currentRole={user.role} protectedAdmin={isConfiguredAdminEmail(user.email)} /><PlanForm userId={user.id} currentPlan={user.subscription?.plan.code || "FREE"} plans={plans.map((plan) => plan.code)} /></div>
              <CreditAdjustForm userId={user.id} currentBalance={user.creditBalance} />
            </div>
            {!!user.creditTransactions.length && <div className="mt-3 flex flex-wrap gap-2">{user.creditTransactions.map((tx) => <span key={tx.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{tx.amount > 0 ? "+" : ""}{tx.amount} · {tx.reason}</span>)}</div>}
          </Card>
        ))}
        {!users.length && <Card><p className="text-slate-500">Eşleşen kullanıcı bulunamadı.</p></Card>}
      </div>
    </div>
  );
}
