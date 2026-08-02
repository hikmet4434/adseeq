import { AdminNav } from "@/components/admin/admin-nav";
import { ManualPaymentForm, PaymentStatusForm } from "@/components/admin/admin-actions";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

function money(cents: number, currency: string) { return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(cents / 100); }

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const [users, payments] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true }, orderBy: { email: "asc" }, take: 500 }),
    prisma.payment.findMany({ include: { user: { select: { email: true } }, actor: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);
  return (
    <div>
      <div className="mb-6"><h1 className="text-3xl font-black">Ödemeler</h1><p className="mt-1 text-slate-500">Manuel tahsilat, referans ve ödeme durumlarını yönetin.</p></div>
      <AdminNav />
      <Card><h2 className="mb-4 text-xl font-black">Manuel ödeme ekle</h2><ManualPaymentForm users={users} /><p className="mt-3 text-xs text-amber-700">Ödeme ile verilen kredi atomik olarak bakiyeye eklenir. İade durumunda kredi otomatik düşmez; kullanıcı ekranından gerekçeli işlem yapın.</p></Card>
      <Card className="mt-5 overflow-hidden p-0">
        <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Kullanıcı</th><th>Tutar</th><th>Sağlayıcı</th><th>Kredi</th><th>Referans</th><th>Tarih</th><th>Durum</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-t border-slate-100"><td className="p-4"><b>{payment.user.email}</b><div className="text-xs text-slate-400">Admin: {payment.actor?.email || "Sistem"}</div></td><td className="font-black">{money(payment.amountCents, payment.currency)}</td><td>{payment.provider}</td><td>{payment.creditGranted}</td><td>{payment.externalId || "—"}</td><td>{payment.createdAt.toLocaleString("tr-TR")}</td><td><PaymentStatusForm paymentId={payment.id} status={payment.status} /></td></tr>)}</tbody></table></div>
        {!payments.length && <div className="p-5 text-sm text-slate-500">Henüz ödeme kaydı yok.</div>}
      </Card>
    </div>
  );
}
