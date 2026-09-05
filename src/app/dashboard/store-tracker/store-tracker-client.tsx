"use client";
import { Card } from "@/components/ui/card";
import { StoreTrackerManager } from "@/components/store-tracker-manager";
import { useT } from "@/lib/i18n";

export function StoreTrackerClient({ tracked, limit }: {
  tracked: any[];
  limit: number | null;
}) {
  const t = useT();
  return (
    <div>
      <h1 className="text-3xl font-black">{t("store.title")}</h1>
      <p className="mt-1 text-slate-500">{t("store.description")}</p>
      <Card className="mt-5">
        <StoreTrackerManager tracked={tracked} limit={limit} />
      </Card>
    </div>
  );
}