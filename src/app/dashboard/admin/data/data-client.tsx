"use client";

import { Card } from "@/components/ui/card";
import { AdminNav } from "@/components/admin/admin-nav";
import { ApifyIngestForm } from "@/components/admin/apify-ingest-form";
import { useLang } from "@/lib/use-lang";
import { useT } from "@/lib/i18n";

export type JobRow = { id: string; source: string; type: string; status: string; recordsImported: number; recordsFailed: number; errorMessage: string | null };

export function AdminDataClient({ ads, stores, users, jobs, configured }: { ads: number; stores: number; users: number; jobs: JobRow[]; configured: boolean }) {
  const [lang] = useLang();
  const t = useT();
  void lang;
  return <div><h1 className="mb-2 text-3xl font-black">{t("adminData.title")}</h1><p className="mb-6 text-slate-500">{t("adminData.subtitle")}</p><AdminNav /><div className="grid gap-4 md:grid-cols-3"><Card><b className="text-3xl">{ads}</b><br />{t("adminData.ads")}</Card><Card><b className="text-3xl">{stores}</b><br />{t("adminData.stores")}</Card><Card><b className="text-3xl">{users}</b><br />{t("adminData.users")}</Card></div><Card className="mt-5"><div className="mb-4"><h2 className="text-xl font-black">{t("adminData.metaAdsTitle")}</h2><p className="mt-1 text-sm text-slate-500">{t("adminData.metaAdsDesc")}</p></div><ApifyIngestForm configured={configured} /></Card><Card className="mt-5"><h2 className="mb-3 font-black">{t("adminData.ingestJobs")}</h2>{jobs.map((j) => <div key={j.id} className="border-t py-3 text-sm"><b>{j.source} · {j.type}</b><div className="text-slate-500">{j.status} · {j.recordsImported} {t("adminData.ok")} · {j.recordsFailed} {t("adminData.failed")}</div>{j.errorMessage && <div className="text-rose-600">{j.errorMessage}</div>}</div>)}{!jobs.length && <p className="text-sm text-slate-500">{t("adminData.noJobs")}</p>}</Card></div>;
}
