import { Prisma, UserRole } from "@prisma/client";
import { AdminUsersClient } from "./users-client";
import { isConfiguredAdminEmail } from "@/lib/admin-emails";
import { requireAdmin } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const query = await searchParams;
  const q = query.q?.trim();
  const role = query.role === "ADMIN" || query.role === "USER" ? query.role as UserRole : undefined;
  const where: Prisma.UserWhereInput = { role };
  if (q) where.OR = [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }];
  const [users, plans] = await Promise.all([
    prisma.user.findMany({ where, include: { subscription: { include: { plan: true } }, creditTransactions: { orderBy: { createdAt: "desc" }, take: 3 } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })
  ]);
  const protectedAdminEmails: Record<string, boolean> = {};
  for (const u of users) protectedAdminEmails[u.email] = isConfiguredAdminEmail(u.email);
  return (
    <AdminUsersClient
      q={q}
      role={role}
      plans={plans}
      protectedAdminEmails={protectedAdminEmails}
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        googleId: user.googleId,
        role: user.role,
        lastLoginLabel: user.lastLoginAt?.toLocaleString("tr-TR") || "",
        createdLabel: user.createdAt.toLocaleDateString("tr-TR"),
        planCode: user.subscription?.plan.code || null,
        creditBalance: user.creditBalance,
        creditTransactions: user.creditTransactions.map((tx) => ({ id: tx.id, amount: tx.amount, reason: tx.reason })),
      }))}
    />
  );
}
