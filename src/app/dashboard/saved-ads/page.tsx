import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { SavedAdsClient } from "./saved-ads-client";

export default async function SavedAdsPage() {
  const user = await requireUser();
  const folders = await prisma.savedFolder.findMany({ where: { userId: user.id } });
  const saved = await prisma.savedAd.findMany({ where: { userId: user.id }, include: { folder: true, ad: { include: { brandPage: true, creatives: { take: 1 } } } }, orderBy: { createdAt: "desc" } });
  return <SavedAdsClient folders={folders} saved={saved} />;
}
