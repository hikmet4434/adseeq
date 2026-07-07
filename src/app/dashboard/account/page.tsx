import { requireUser } from "@/lib/auth/current-user";
import { Card } from "@/components/ui/card";

export default async function AccountPage() {
  const user = await requireUser();
  return <Card><h1 className="text-3xl font-black">My Account</h1><p className="mt-4 text-slate-600">{user.email} · Plan: {user.subscription?.plan.name}</p></Card>;
}
