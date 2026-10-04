"use client";
import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { outreachMessage, stoppedAdvertisersCsv, type StoppedAdvertiser } from "@/lib/stopped-advertisers";

type Row = Omit<StoppedAdvertiser, "lastAdEndedAt"> & { lastAdEndedAt: string | null; isLocked: boolean };

function downloadCsv(rows: Row[]) {
  const csv = stoppedAdvertisersCsv(rows.filter((row) => !row.isLocked).map((row) => ({ ...row, lastAdEndedAt: row.lastAdEndedAt ? new Date(row.lastAdEndedAt) : null })));
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reklami-durmus-markalar-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function websiteUrl(website: string) {
  return /^https?:\/\//.test(website) ? website : `https://${website}`;
}

export function StoppedAdvertisersClient({ q, country, countries, rows, isPaid, brandCount }: {
  q: string;
  country: string;
  countries: ReadonlyArray<readonly [string, string]>;
  rows: Row[];
  isPaid: boolean;
  brandCount: number;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyMessage(row: Row) {
    navigator.clipboard?.writeText(outreachMessage(row)).then(() => setCopiedId(row.brandPageId)).catch(() => undefined);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Reklamı Durmuş Markalar</h1>
          <p className="mt-1 max-w-3xl text-slate-500">Daha önce Meta'da reklam verip şu an hiç aktif reklamı olmayan markalar. Reklam bütçeleri var ama bir şey tutmamış; reklam ve kreatif hizmeti satmak için en sıcak potansiyel müşteriler bunlar. Müşteri skoru; reklam sayısı, ne kadar yakın zamanda durdukları ve web sitesi olup olmadığına göre hesaplanır.</p>
        </div>
        <button type="button" onClick={() => downloadCsv(rows)} disabled={!rows.length} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">CSV indir</button>
      </div>

      <form className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-soft md:grid-cols-[1fr_220px_120px]">
        <input name="q" defaultValue={q} placeholder="Sektör veya anahtar kelime (ör. halı yıkama, kuaför)" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <select name="country" defaultValue={country} aria-label="Ülke" className="rounded-2xl border border-slate-200 px-4 py-3">
          {countries.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <button className="rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white">Bul</button>
      </form>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card><div className="text-sm text-slate-500">İncelenen marka</div><div className="mt-1 text-3xl font-black">{brandCount}</div></Card>
        <Card><div className="text-sm text-slate-500">Reklamı durmuş</div><div className="mt-1 text-3xl font-black text-violet-700">{rows.length}</div></Card>
        <Card><div className="text-sm text-slate-500">Son 30 günde durmuş</div><div className="mt-1 text-3xl font-black text-emerald-600">{rows.filter((row) => row.daysSinceStopped !== null && row.daysSinceStopped <= 30).length}</div></Card>
      </div>

      {!isPaid && rows.length > 5 && <Card className="mb-5 border-violet-200 bg-violet-50"><p className="text-sm font-semibold text-violet-900">Ücretsiz planda ilk 5 markanın iletişim bilgileri görünür. Tüm listeyi ve CSV'nin tamamını açmak için <Link href="/pricing" className="underline">planınızı yükseltin</Link>.</p></Card>}

      {rows.length === 0 && <Card><p className="text-sm text-slate-600">Bu filtreyle reklamı durmuş marka bulunamadı. <Link href="/dashboard/ads" className="font-bold text-violet-700">Reklamlar</Link> sayfasında "Pasif reklamlar" veya "Tüm durumlar" seçerek o sektörden veri çekin; pasif reklamlar ne kadar çok olursa liste o kadar büyür.</p></Card>}

      <div className="space-y-3">
        {rows.map((row) => (
          <Card key={row.brandPageId} className={row.isLocked ? "opacity-70" : ""}>
            <div className="flex flex-wrap items-center gap-4">
              {row.brandLogoUrl ? <img src={row.brandLogoUrl} alt="" className="h-12 w-12 rounded-full object-cover" referrerPolicy="no-referrer" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 font-black text-slate-500">{row.brandName.slice(0, 1)}</div>}
              <div className="min-w-0 flex-1">
                <div className="font-black">{row.brandName}</div>
                <div className="text-sm text-slate-500">{row.totalAds} reklam · en uzun {row.longestRunDays} gün · {row.daysSinceStopped === null ? "durma tarihi bilinmiyor" : `${row.daysSinceStopped} gündür reklam yok`}{row.countries.length ? ` · ${row.countries.join(", ")}` : ""}</div>
                {row.sampleHeadline && <div className="mt-1 truncate text-xs text-slate-500">Son mesajı: “{row.sampleHeadline}”</div>}
              </div>
              <div className="text-center"><div className="text-2xl font-black text-violet-700">{row.leadScore}</div><div className="text-xs text-slate-500">müşteri skoru</div></div>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                {row.isLocked ? <Link href="/pricing" className="rounded-lg bg-violet-700 px-3 py-2 text-white">Kilidi aç</Link> : <>
                  {row.website && <a href={websiteUrl(row.website)} target="_blank" rel="noreferrer noopener" className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">Web sitesi ↗</a>}
                  {row.brandPageUrl && <a href={row.brandPageUrl} target="_blank" rel="noreferrer noopener" className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">Facebook ↗</a>}
                  <button type="button" onClick={() => setOpenId(openId === row.brandPageId ? null : row.brandPageId)} className="rounded-lg bg-violet-100 px-3 py-2 text-violet-800">Mesaj taslağı</button>
                </>}
              </div>
            </div>
            {openId === row.brandPageId && !row.isLocked && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">{outreachMessage(row)}</pre>
                <button type="button" onClick={() => copyMessage(row)} className="mt-3 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">{copiedId === row.brandPageId ? "Kopyalandı ✓" : "Mesajı kopyala"}</button>
                <p className="mt-2 text-xs text-slate-500">E-posta, Facebook sayfası mesajı veya Marketplace DM olarak gönderebilirsiniz. Önce karşı tarafın cevabını alın, teklifinizi ikinci mesajda verin.</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
