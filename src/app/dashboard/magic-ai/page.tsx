import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";
import { AdCreativeMedia } from "@/components/ad-creative-media";

function sentence(value?: string | null) {
  return value?.split(/[.!?\n]/).map((item) => item.trim()).find(Boolean) || "Metin kancası bulunamadı";
}

function recommendation(ad: { daysRunning: number | null; mediaType: string; primaryText: string | null; status: string }) {
  const days = ad.daysRunning || 0;
  if (ad.status === "INACTIVE") return { label: "ARŞİV", color: "bg-slate-100 text-slate-700", text: "Reklam artık aktif değil; mesajı referans olarak sakla, doğrudan ölçekleme yapma." };
  if (days >= 30) return { label: "ÖLÇEKLE", color: "bg-emerald-50 text-emerald-700", text: `${days} günlük dayanıklılık güçlü bir pazar uyumuna işaret ediyor. Kancayı yeni ${ad.mediaType.toLowerCase()} varyasyonlarında test et.` };
  if (days >= 14) return { label: "VARYASYON", color: "bg-violet-50 text-violet-700", text: "Kreatif yeterli süre yaşamış. Aynı vaadi farklı açılış karesi ve CTA ile çoğalt." };
  return { label: "İZLE", color: "bg-amber-50 text-amber-700", text: "Reklam yeni. Harcama sinyali oluşmadan önce birkaç gün daha performansını izle." };
}

export default async function MagicAIPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const q = (await searchParams).q?.trim();
  const where: Prisma.AdWhereInput = q ? { OR: [{ headline: { contains: q, mode: "insensitive" } }, { primaryText: { contains: q, mode: "insensitive" } }, { brandPage: { name: { contains: q, mode: "insensitive" } } }] } : {};
  const ads = await prisma.ad.findMany({ where, include: { brandPage: true, creatives: { take: 1 } }, orderBy: [{ daysRunning: "desc" }, { updatedAt: "desc" }], take: 18 });

  return (
    <div>
      <div className="mb-6"><h1 className="text-3xl font-black">Magic AI</h1><p className="mt-1 text-slate-500">Kreatif dayanıklılığı, formatı ve reklam metnini analiz ederek uygulanabilir test önerileri üretir.</p></div>
      <form className="mb-5 flex gap-3 rounded-3xl bg-white p-4 shadow-soft"><input name="q" defaultValue={q} placeholder="Ürün, marka veya reklam metni ara" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3" /><button className="rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white">Analiz et</button></form>
      <div className="mb-5 rounded-3xl bg-gradient-to-r from-violet-700 to-fuchsia-600 p-6 text-white"><div className="text-sm font-bold uppercase tracking-widest text-violet-100">Creative Intelligence</div><h2 className="mt-2 text-2xl font-black">{ads.length} reklamdan aksiyon planı</h2><p className="mt-1 text-violet-100">Öneriler canlı reklam süresi ve mevcut kreatif sinyallerinden hesaplanır.</p></div>
      <div className="grid gap-5 lg:grid-cols-2">{ads.map((ad) => { const insight = recommendation(ad); return <Card key={ad.id}>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]"><AdCreativeMedia creative={ad.creatives[0]} className="h-44 w-full rounded-2xl object-cover" /><div><div className="flex items-start justify-between gap-3"><div><h2 className="font-black">{ad.headline || "Başlıksız reklam"}</h2><p className="text-sm text-slate-500">{ad.brandPage?.name || "Bilinmeyen marka"} · {ad.mediaType} · {ad.daysRunning || "—"} gün</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${insight.color}`}>{insight.label}</span></div><div className="mt-4 rounded-2xl bg-slate-50 p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Kanca</div><p className="mt-1 line-clamp-2 text-sm font-semibold">{sentence(ad.primaryText)}</p></div><p className="mt-3 text-sm text-slate-600">{insight.text}</p></div></div>
      </Card>; })}{!ads.length && <Card className="text-center text-slate-500 lg:col-span-2">Analiz edilecek reklam bulunamadı.</Card>}</div>
    </div>
  );
}
