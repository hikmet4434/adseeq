import bcrypt from "bcryptjs";
import {
  AdScore,
  AdSource,
  AdStatus,
  MediaType,
  PlanCode,
  PrismaClient,
  StorePlatform,
  UsagePeriod,
  UserRole
} from "@prisma/client";

const prisma = new PrismaClient();

const planFeatures = {
  FREE: {
    adsSearchDaily: 10,
    storesSearchDaily: null,
    tiktokSearchDaily: 0,
    trendsSearchDaily: 5,
    apiCreditsMonthly: 0,
    trackedStores: 0,
    followedBrands: 0,
    savedAds: 20,
    advancedFilters: false,
    lockedResults: true,
    exportEnabled: false
  },
  BASIC: {
    adsSearchDaily: 100,
    storesSearchDaily: null,
    tiktokSearchDaily: 200,
    trendsSearchDaily: 20,
    apiCreditsMonthly: 100,
    trackedStores: 25,
    followedBrands: 2,
    savedAds: 500,
    advancedFilters: false,
    lockedResults: false,
    exportEnabled: true
  },
  STANDARD: {
    adsSearchDaily: 500,
    storesSearchDaily: null,
    tiktokSearchDaily: 1000,
    trendsSearchDaily: 100,
    apiCreditsMonthly: 20000,
    trackedStores: 50,
    followedBrands: 30,
    savedAds: 2000,
    advancedFilters: true,
    lockedResults: false,
    exportEnabled: true,
    pinterestAds: true,
    tiktokAds: true
  },
  PREMIUM: {
    adsSearchDaily: 2000,
    storesSearchDaily: null,
    tiktokSearchDaily: null,
    trendsSearchDaily: null,
    apiCreditsMonthly: 20000,
    trackedStores: 500,
    followedBrands: 200,
    savedAds: null,
    advancedFilters: true,
    lockedResults: false,
    exportEnabled: true,
    weeklyResearchCall: true,
    pinterestAds: true,
    tiktokAds: true
  }
};

const stores = [
  {
    domain: "petpro-demo.com",
    name: "PetPro Demo",
    logoUrl: "https://placehold.co/96x96/7c3aed/ffffff?text=PP",
    country: "US",
    currency: "USD",
    language: "en",
    niche: "Pets",
    categoryPath: ["Pets", "Dog Accessories"],
    theme: "Dawn",
    visits: 120000,
    growth: 18.2,
    revMin: 45000,
    revMax: 90000,
    products: [
      ["Smart Dog Collar", 29.99, true],
      ["No Pull Dog Harness", 34.99, true],
      ["Travel Pet Bottle", 19.99, false]
    ],
    pixels: ["Meta Pixel", "TikTok Pixel", "Google Analytics"],
    apps: ["Klaviyo", "Judge.me", "ReConvert"]
  },
  {
    domain: "glowly-demo.com",
    name: "Glowly Demo",
    logoUrl: "https://placehold.co/96x96/ec4899/ffffff?text=GL",
    country: "GB",
    currency: "GBP",
    language: "en",
    niche: "Beauty",
    categoryPath: ["Beauty", "Skincare"],
    theme: "Prestige",
    visits: 245000,
    growth: 27.5,
    revMin: 90000,
    revMax: 180000,
    products: [
      ["LED Face Sculptor", 69.99, true],
      ["Hydrating Serum Kit", 39.99, false],
      ["Ice Roller Pro", 22.99, true]
    ],
    pixels: ["Meta Pixel", "Pinterest Tag", "Google Analytics"],
    apps: ["Klaviyo", "Loox", "Recharge"]
  },
  {
    domain: "fitfuel-demo.com",
    name: "FitFuel Demo",
    logoUrl: "https://placehold.co/96x96/16a34a/ffffff?text=FF",
    country: "US",
    currency: "USD",
    language: "en",
    niche: "Supplements",
    categoryPath: ["Health", "Supplements"],
    theme: "Impulse",
    visits: 310000,
    growth: 9.4,
    revMin: 130000,
    revMax: 260000,
    products: [
      ["Greens Energy Blend", 49.99, true],
      ["Sleep Recovery Gummies", 24.99, true],
      ["Protein Coffee", 39.99, false]
    ],
    pixels: ["Meta Pixel", "TikTok Pixel", "Google Analytics"],
    apps: ["Klaviyo", "Recharge", "Yotpo"]
  },
  {
    domain: "homezen-demo.com",
    name: "HomeZen Demo",
    logoUrl: "https://placehold.co/96x96/0ea5e9/ffffff?text=HZ",
    country: "DE",
    currency: "EUR",
    language: "de",
    niche: "Household",
    categoryPath: ["Household", "Home Gadgets"],
    theme: "Refresh",
    visits: 87000,
    growth: 34.8,
    revMin: 30000,
    revMax: 70000,
    products: [
      ["Magnetic Window Cleaner", 24.99, true],
      ["Foldable Storage Rack", 44.99, false],
      ["Mini Desk Vacuum", 17.99, true]
    ],
    pixels: ["Meta Pixel", "Google Analytics"],
    apps: ["Judge.me", "Klaviyo"]
  }
];

const adCopy = [
  {
    domain: "petpro-demo.com",
    headline: "Smart Dog Collar",
    text: "Your dog deserves a safer walk. Meet the smart collar loved by 20,000+ pet parents.",
    media: MediaType.VIDEO,
    score: AdScore.ESTABLISHED,
    countries: ["US", "GB", "CA"],
    days: 27,
    rank: 8,
    niche: "Pets"
  },
  {
    domain: "petpro-demo.com",
    headline: "No Pull Dog Harness",
    text: "No more pulling. Give your dog freedom while staying in control.",
    media: MediaType.IMAGE,
    score: AdScore.HAS_POTENTIAL,
    countries: ["US"],
    days: 9,
    rank: 19,
    niche: "Pets"
  },
  {
    domain: "glowly-demo.com",
    headline: "LED Face Sculptor",
    text: "Spa-level glow at home. See why creators are switching to LED sculpting.",
    media: MediaType.VIDEO,
    score: AdScore.ESTABLISHED,
    countries: ["GB", "US", "AU"],
    days: 42,
    rank: 4,
    niche: "Beauty"
  },
  {
    domain: "glowly-demo.com",
    headline: "Hydrating Serum Kit",
    text: "Dry skin? Build a 3-step hydration routine that actually feels lightweight.",
    media: MediaType.CAROUSEL,
    score: AdScore.HAS_POTENTIAL,
    countries: ["GB"],
    days: 15,
    rank: 16,
    niche: "Beauty"
  },
  {
    domain: "fitfuel-demo.com",
    headline: "Greens Energy Blend",
    text: "Your morning coffee is not enough. Get clean energy with greens, adaptogens, and no crash.",
    media: MediaType.VIDEO,
    score: AdScore.ESTABLISHED,
    countries: ["US", "CA"],
    days: 61,
    rank: 2,
    niche: "Supplements"
  },
  {
    domain: "fitfuel-demo.com",
    headline: "Sleep Recovery Gummies",
    text: "Wake up rested. Sleep Recovery Gummies support your nightly wind-down routine.",
    media: MediaType.IMAGE,
    score: AdScore.HAS_POTENTIAL,
    countries: ["US"],
    days: 6,
    rank: 26,
    niche: "Supplements"
  },
  {
    domain: "homezen-demo.com",
    headline: "Magnetic Window Cleaner",
    text: "Clean both sides of your window from inside. The gadget going viral in Europe.",
    media: MediaType.VIDEO,
    score: AdScore.HAS_POTENTIAL,
    countries: ["DE", "AT", "CH"],
    days: 18,
    rank: 12,
    niche: "Household"
  },
  {
    domain: "homezen-demo.com",
    headline: "Foldable Storage Rack",
    text: "Small home? Create more space with a foldable storage rack.",
    media: MediaType.IMAGE,
    score: AdScore.UNESTABLISHED,
    countries: ["DE"],
    days: 3,
    rank: 49,
    niche: "Household",
    inactive: true
  }
];

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  console.log("🌱 Seeding WinningHunter...");

  const free = await prisma.plan.upsert({
    where: { code: PlanCode.FREE },
    update: { features: planFeatures.FREE },
    create: { code: PlanCode.FREE, name: "Free", monthlyPriceEur: 0, quarterlyPriceEur: 0, yearlyPriceEur: 0, features: planFeatures.FREE, sortOrder: 0 }
  });
  const basic = await prisma.plan.upsert({
    where: { code: PlanCode.BASIC },
    update: { features: planFeatures.BASIC },
    create: { code: PlanCode.BASIC, name: "Basic", monthlyPriceEur: 42, quarterlyPriceEur: 107, yearlyPriceEur: 302, features: planFeatures.BASIC, sortOrder: 1 }
  });
  await prisma.plan.upsert({
    where: { code: PlanCode.STANDARD },
    update: { features: planFeatures.STANDARD },
    create: { code: PlanCode.STANDARD, name: "Standard", monthlyPriceEur: 68, quarterlyPriceEur: 173, yearlyPriceEur: 490, features: planFeatures.STANDARD, sortOrder: 2 }
  });
  await prisma.plan.upsert({
    where: { code: PlanCode.PREMIUM },
    update: { features: planFeatures.PREMIUM },
    create: { code: PlanCode.PREMIUM, name: "Premium", monthlyPriceEur: 212, quarterlyPriceEur: 541, yearlyPriceEur: 1526, features: planFeatures.PREMIUM, sortOrder: 3 }
  });

  const demo = await prisma.user.upsert({
    where: { email: "demo@winninghunter.local" },
    update: { passwordHash: await bcrypt.hash("demo1234", 10), name: "Demo User" },
    create: {
      email: "demo@winninghunter.local",
      name: "Demo User",
      passwordHash: await bcrypt.hash("demo1234", 10),
      role: UserRole.USER,
      subscription: { create: { planId: free.id, status: "ACTIVE" } }
    }
  });
  const admin = await prisma.user.upsert({
    where: { email: "admin@winninghunter.local" },
    update: { passwordHash: await bcrypt.hash("admin1234", 10), name: "Admin", role: UserRole.ADMIN },
    create: {
      email: "admin@winninghunter.local",
      name: "Admin",
      passwordHash: await bcrypt.hash("admin1234", 10),
      role: UserRole.ADMIN,
      subscription: { create: { planId: basic.id, status: "ACTIVE" } }
    }
  });

  for (const s of stores) {
    const store = await prisma.store.upsert({
      where: { domain: s.domain },
      update: {
        name: s.name,
        logoUrl: s.logoUrl,
        country: s.country,
        currency: s.currency,
        language: s.language,
        niche: s.niche,
        categoryPath: s.categoryPath,
        shopifyTheme: s.theme,
        monthlyVisits: s.visits,
        monthlyVisitGrowth: s.growth,
        estRevenue30dMin: s.revMin,
        estRevenue30dMax: s.revMax
      },
      create: {
        domain: s.domain,
        name: s.name,
        logoUrl: s.logoUrl,
        platform: StorePlatform.SHOPIFY,
        country: s.country,
        currency: s.currency,
        language: s.language,
        niche: s.niche,
        categoryPath: s.categoryPath,
        shopUrl: `https://${s.domain}`,
        createdAtSource: daysAgo(720),
        dataSince: daysAgo(180),
        shopifyTheme: s.theme,
        productCount: s.products.length,
        collectionCount: 8,
        trustpilotScore: 4.2 + Math.random() * 0.5,
        trustpilotReviewCount: Math.floor(400 + Math.random() * 2000),
        monthlyVisits: s.visits,
        monthlyVisitGrowth: s.growth,
        estRevenue30dMin: s.revMin,
        estRevenue30dMax: s.revMax,
        estRevenue24hMin: Math.round(s.revMin / 30),
        estRevenue24hMax: Math.round(s.revMax / 30),
        trafficCountries: { [s.country]: 68, US: 18, GB: 8, CA: 6 },
        socials: { instagram: `https://instagram.com/${s.name.toLowerCase().replaceAll(" ", "")}` }
      }
    });

    await prisma.brandPage.upsert({
      where: { source_externalPageId: { source: AdSource.META, externalPageId: `page_${s.domain}` } },
      update: { storeId: store.id, name: s.name, logoUrl: s.logoUrl, websiteDomain: s.domain },
      create: {
        source: AdSource.META,
        externalPageId: `page_${s.domain}`,
        name: s.name,
        logoUrl: s.logoUrl,
        websiteDomain: s.domain,
        pageUrl: `https://facebook.com/${s.domain.replaceAll(".", "")}`,
        fbLikes: Math.round(s.visits / 8),
        igFollowers: Math.round(s.visits / 5),
        country: s.country,
        niche: s.niche,
        storeId: store.id
      }
    });

    for (const [title, price, best] of s.products) {
      const handle = String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await prisma.storeProduct.upsert({
        where: { id: `${store.id}_${handle}` },
        update: { title: String(title), price: Number(price), isBestSeller: Boolean(best) },
        create: {
          id: `${store.id}_${handle}`,
          storeId: store.id,
          title: String(title),
          handle,
          imageUrl: `https://placehold.co/320x240/f1f5f9/0f172a?text=${encodeURIComponent(String(title))}`,
          productUrl: `https://${s.domain}/products/${handle}`,
          price: Number(price),
          compareAtPrice: Number(price) * 1.6,
          currency: s.currency,
          variantCount: 3,
          isBestSeller: Boolean(best),
          firstSeenAt: daysAgo(90)
        }
      });
    }
    for (const pixel of s.pixels) {
      await prisma.storePixel.upsert({ where: { storeId_type_value: { storeId: store.id, type: pixel, value: "" } }, update: {}, create: { storeId: store.id, type: pixel, value: "" } });
    }
    for (const app of s.apps) {
      await prisma.storeApp.upsert({ where: { storeId_name: { storeId: store.id, name: app } }, update: {}, create: { storeId: store.id, name: app, category: "Marketing" } });
    }
    for (let i = 0; i < 6; i++) {
      const date = daysAgo(i * 30);
      await prisma.storeSnapshot.upsert({
        where: { storeId_date: { storeId: store.id, date } },
        update: {},
        create: { storeId: store.id, date, monthlyVisits: Math.round(s.visits * (1 - i * 0.06)), estRevenueMin: Math.round(s.revMin * (1 - i * 0.05)), estRevenueMax: Math.round(s.revMax * (1 - i * 0.05)), activeAdsCount: Math.max(2, 22 - i * 2), productCount: s.products.length }
      });
    }
  }

  let adIndex = 1;
  for (const a of adCopy) {
    const page = await prisma.brandPage.findFirstOrThrow({ where: { websiteDomain: a.domain } });
    const ad = await prisma.ad.upsert({
      where: { source_externalAdId: { source: AdSource.META, externalAdId: `demo_ad_${adIndex}` } },
      update: {},
      create: {
        source: AdSource.META,
        externalAdId: `demo_ad_${adIndex}`,
        brandPageId: page.id,
        status: a.inactive ? AdStatus.INACTIVE : AdStatus.ACTIVE,
        mediaType: a.media,
        adScore: a.score,
        primaryText: a.text,
        headline: a.headline,
        description: "Demo competitive intelligence ad.",
        ctaText: "Shop Now",
        landingUrl: `https://${a.domain}`,
        productUrl: `https://${a.domain}/products/${a.headline.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        language: a.domain.includes("homezen") ? "de" : "en",
        countries: a.countries,
        niche: a.niche,
        firstSeenAt: daysAgo(a.days),
        lastSeenAt: a.inactive ? daysAgo(5) : new Date(),
        createdAtSource: daysAgo(a.days),
        daysRunning: a.days,
        estimatedReachMin: 10000 * adIndex,
        estimatedReachMax: 40000 * adIndex,
        estimatedSpendMin: 500 * adIndex,
        estimatedSpendMax: 1600 * adIndex,
        estimatedCpm: 12 + adIndex,
        rank: 100 - a.rank,
        rankPercentile: a.rank,
        rankGrowth: a.rank < 20 ? "Rising" : "Stable"
      }
    });
    await prisma.adCreative.create({
      data: {
        adId: ad.id,
        type: a.media,
        url: `https://placehold.co/640x480/111827/ffffff?text=${encodeURIComponent(a.headline)}`,
        thumbnailUrl: `https://placehold.co/640x480/111827/ffffff?text=${encodeURIComponent(a.headline)}`,
        durationSeconds: a.media === MediaType.VIDEO ? 30 + adIndex : null
      }
    });
    for (const [type, value] of [
      ["hook", a.text.split(".")[0]],
      ["angle", `${a.niche} winning angle`],
      ["persona", `${a.niche} buyers`],
      ["emotion", a.rank < 15 ? "Urgency" : "Trust"]
    ]) {
      await prisma.aITag.create({ data: { adId: ad.id, type, value, confidence: 0.91, model: "seed-demo", promptVersion: "v0" } });
    }
    adIndex++;
  }

  const firstAd = await prisma.ad.findFirstOrThrow();
  const folder = await prisma.savedFolder.upsert({
    where: { userId_name: { userId: demo.id, name: "Kazanan Pet Reklamları" } },
    update: {},
    create: { userId: demo.id, name: "Kazanan Pet Reklamları", color: "#22c55e" }
  });
  await prisma.savedAd.upsert({
    where: { userId_adId: { userId: demo.id, adId: firstAd.id } },
    update: { folderId: folder.id },
    create: { userId: demo.id, adId: firstAd.id, folderId: folder.id, note: "Demo kayıt." }
  });
  const firstStore = await prisma.store.findFirstOrThrow();
  await prisma.trackedStore.upsert({
    where: { userId_storeId: { userId: admin.id, storeId: firstStore.id } },
    update: {},
    create: { userId: admin.id, storeId: firstStore.id, notes: "Demo takip." }
  });
  await prisma.usageCounter.upsert({
    where: { userId_metric_periodKey: { userId: demo.id, metric: "ads_search_daily", periodKey: new Date().toISOString().slice(0, 10) } },
    update: { used: 1, limit: 10 },
    create: { userId: demo.id, metric: "ads_search_daily", period: UsagePeriod.DAILY, periodKey: new Date().toISOString().slice(0, 10), used: 1, limit: 10 }
  });
  await prisma.ingestJob.create({ data: { source: "seed", type: "demo-data", status: "COMPLETED", startedAt: new Date(), finishedAt: new Date(), recordsImported: 18 } });

  console.log("✅ Demo: demo@winninghunter.local / demo1234");
  console.log("✅ Admin: admin@winninghunter.local / admin1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
