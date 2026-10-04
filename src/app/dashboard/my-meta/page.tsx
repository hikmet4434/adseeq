import { requireUser } from "@/lib/auth/current-user";
import { MyMetaClient } from "./my-meta-client";

export default async function MyMetaPage() {
  await requireUser();
  return <MyMetaClient />;
}
