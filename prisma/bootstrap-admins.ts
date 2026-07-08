import { PrismaClient, SubscriptionStatus, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function getConfiguredAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(/[\s,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function main() {
  const adminEmails = getConfiguredAdminEmails();
  if (adminEmails.length === 0) {
    console.log("No ADMIN_EMAILS configured. Skipping admin bootstrap.");
    return;
  }

  const premiumPlan = await prisma.plan.findUnique({ where: { code: "PREMIUM" } });
  if (!premiumPlan) {
    throw new Error("PREMIUM plan is not seeded.");
  }

  for (const email of adminEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`Admin email ${email} is configured but user does not exist yet.`);
      continue;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: UserRole.ADMIN }
    });

    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        planId: premiumPlan.id,
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: false
      },
      create: {
        userId: user.id,
        planId: premiumPlan.id,
        status: SubscriptionStatus.ACTIVE
      }
    });

    console.log(`Admin access ensured for ${email}.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
