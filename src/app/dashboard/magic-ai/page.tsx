import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";
import { AdCreativeMedia } from "@/components/ad-creative-media";
import { MagicAiRunner } from "@/components/magic-ai-runner";

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
  const user = await requireUser();
  const q = (await searchParams).q?.trim();
  const where: Prisma.AdWhereInput = q ? { OR: [{ headline: { contains: q, mode: "insensitive" } }, { primaryText: { contains: q, mode: "insensitive" } }, { brandPage: { name: { contains: q, mode: "insensitive" } } }] } : {};
  const [ads, analyses] = await Promise.all([
    prisma.ad.findMany({ where, include: { brandPage: true, creatives: { take: 1 } }, orderBy: [{ daysRunning: "desc" }, { updatedAt: "desc" }], take: 18 }),
    prisma.aiAnalysis.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 })
  ]);

  return (
    <div>
      <div className="mb-6"><h1 className="text-3xl font-black">Magic AI</h1><p className="mt-1 text-slate-500">Kreatif dayanıklılığı, formatı ve reklam metnini analiz ederek uygulanabilir test önerileri üretir.</p></div>
      <MagicAiRunner />
      {analyses.length > 0 && <div className="mb-5 grid gap-4 lg:grid-cols-2">{analyses.map((analysis) => <Card key={analysis.id}><div className="flex justify-between gap-3"><h2 className="font-black">{analysis.query || "Genel kreatif analizi"}</h2><span className="text-xs text-slate-400">{analysis.model}</span></div><p className="mt-2 text-sm text-slate-600">{analysis.summary}</p><div className="mt-3 space-y-2">{(analysis.insights as Array<{title:string;action:string;confidence:number}>).map((item, index) => <div key={index} className="rounded-2xl bg-violet-50 p-3 text-sm"><b>{item.title}</b><p className="mt-1 text-slate-600">{item.action}</p></div>)}</div></Card>)}</div>}
      <div className="mb-5 rounded-3xl bg-gradient-to-r from-violet-700 to-fuchsia-600 p-6 text-white"><div className="text-sm font-bold uppercase tracking-widest text-violet-100">Creative Intelligence</div><h2 className="mt-2 text-2xl font-black">{ads.length} reklamdan aksiyon planı</h2><p className="mt-1 text-violet-100">Öneriler canlı reklam süresi ve mevcut kreatif sinyallerinden hesaplanır.</p></div>
      <div className="grid gap-5 lg:grid-cols-2">{ads.map((ad) => { const insight = recommendation(ad); return <Card key={ad.id}>
        <div className="grid gap-4 sm:grid-cols-[180px_1fr]"><AdCreativeMedia creative={ad.creatives[0]} className="h-44 w-full rounded-2xl object-cover" /><div><div className="flex items-start justify-between gap-3"><div><h2 className="font-black">{ad.headline || "Başlıksız reklam"}</h2><p className="text-sm text-slate-500">{ad.brandPage?.name || "Bilinmeyen marka"} · {ad.mediaType} · {ad.daysRunning || "—"} gün</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${insight.color}`}>{insight.label}</span></div><div className="mt-4 rounded-2xl bg-slate-50 p-3"><div className="text-xs font-bold uppercase tracking-wide text-slate-400">Kanca</div><p className="mt-1 line-clamp-2 text-sm font-semibold">{sentence(ad.primaryText)}</p></div><p className="mt-3 text-sm text-slate-600">{insight.text}</p></div></div>
      </Card>; })}{!ads.length && <Card className="text-center text-slate-500 lg:col-span-2">Analiz edilecek reklam bulunamadı.</Card>}</div>
    </div>
  );
}
