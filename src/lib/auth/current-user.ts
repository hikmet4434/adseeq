import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

export async function currentUser() {
  return getSessionUser();
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard/ads");
  return user;
}
