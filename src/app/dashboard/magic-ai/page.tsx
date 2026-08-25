import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { MagicAiClient } from "./magic-ai-client";

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

  return <MagicAiClient q={q} ads={ads} analyses={analyses} sentence={sentence} recommendation={recommendation} />;
}
