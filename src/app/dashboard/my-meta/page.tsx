import { requireUser } from "@/lib/auth/current-user";
import { hasPaidPlan } from "@/lib/plans";
import { MyMetaClient } from "./my-meta-client";

export default async function MyMetaPage() {
  const user = await requireUser();
  return <MyMetaClient canUseAi={hasPaidPlan(user as never)} />;
}
