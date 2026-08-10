import { PrismaClient } from "@prisma/client";
import { spawn } from "node:child_process";

const prisma = new PrismaClient();

async function runSeed() {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("npx", ["tsx", "prisma/seed.ts"], {
      stdio: "inherit",
      shell: true
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Seed failed with exit code ${code}`));
    });
  });
}

async function main() {
  if (process.env.ENABLE_DEMO_ACCOUNTS !== "true") {
    const removed = await prisma.user.deleteMany({
      where: { email: { in: ["demo@winninghunter.local", "admin@winninghunter.local"] } }
    });
    if (removed.count > 0) console.log(`🔒 ${removed.count} public demo account(s) removed.`);
  }

  const [plans, users, ads] = await Promise.all([
    prisma.plan.count(),
    prisma.user.count(),
    prisma.ad.count()
  ]);

  if (plans > 0 && users > 0 && ads > 0) {
    console.log("✅ Database already seeded. Skipping demo seed.");
    return;
  }

  console.log("🌱 Empty database detected. Running demo seed...");
  await runSeed();
  if (process.env.ENABLE_DEMO_ACCOUNTS !== "true") {
    await prisma.user.deleteMany({ where: { email: { in: ["demo@winninghunter.local", "admin@winninghunter.local"] } } });
    console.log("🔒 Public demo accounts removed.");
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
