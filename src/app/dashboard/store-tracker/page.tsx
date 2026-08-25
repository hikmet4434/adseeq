import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";
import { StoreTrackerManager } from "@/components/store-tracker-manager";
import { getFeatureLimit, planFromUser } from "@/lib/plans";
import { StoreTrackerClient } from "./store-tracker-client";

export default async function StoreTrackerPage() {
  const user = await requireUser();
  const tracked = await prisma.trackedStore.findMany({ where: { userId: user.id }, include: { store: { include: { products: { where: { isBestSeller: true }, take: 2 } } } }, orderBy: { createdAt: "desc" } });
  const limit = getFeatureLimit(planFromUser(user as any), "tracked_stores");
  return <StoreTrackerClient tracked={tracked} limit={limit} />;
}
