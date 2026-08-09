import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";
import { StoreTrackerManager } from "@/components/store-tracker-manager";
import { getFeatureLimit, planFromUser } from "@/lib/plans";

export default async function StoreTrackerPage() {
  const user = await requireUser();
  const tracked = await prisma.trackedStore.findMany({ where: { userId: user.id }, include: { store: { include: { products: { where: { isBestSeller: true }, take: 2 } } } }, orderBy: { createdAt: "desc" } });
  const limit = getFeatureLimit(planFromUser(user as any), "tracked_stores");
  return (
    <div>
      <h1 className="text-3xl font-black">Store Tracker</h1>
      <p className="mt-1 text-slate-500">Plan limitine göre rakip Shopify mağazalarını watchlist’e ekle.</p>
      <Card className="mt-5">
        <StoreTrackerManager tracked={tracked} limit={limit} />
      </Card>
    </div>
  );
}
