import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Shared mutable test state accessed by virtual stub modules.
const state = {
  user: null,
  plans: new Map(),
  subscriptions: new Map(),
  payments: new Map(),
  usageCounters: new Map(),
  ads: new Map(),
  brandPages: new Map(),
  aiAnalyses: [],
  stripeEvents: new Map(),
  stripeSubscriptions: new Map(),
  calls: {
    analyzeCreatives: 0,
    analyzeWinningAd: 0,
    analyzeAccountAds: 0,
    fetchPublicPage: 0,
    findContacts: 0,
    fetchAccountInsights: 0,
    stripeRetrieve: 0
  },
  failures: {
    analyzeCreatives: null,
    analyzeWinningAd: null,
    analyzeAccountAds: null,
    fetchAccountInsights: null
  },
  metaInsightsRows: []
};

globalThis.__adseeqTestState = state;

const virtualModules = {
  "@prisma/client": `
    export const PlanCode = { FREE: "FREE", BASIC: "BASIC", STANDARD: "STANDARD", PREMIUM: "PREMIUM" };
    export const SubscriptionStatus = { ACTIVE: "ACTIVE", TRIALING: "TRIALING", PAST_DUE: "PAST_DUE", CANCELED: "CANCELED", EXPIRED: "EXPIRED" };
    export const PaymentStatus = { PENDING: "PENDING", PAID: "PAID", FAILED: "FAILED", REFUNDED: "REFUNDED", CANCELED: "CANCELED" };
    export const UsagePeriod = { DAILY: "DAILY", MONTHLY: "MONTHLY", LIFETIME: "LIFETIME" };
    export const Prisma = {};
  `,
  "next/server": `
    export class NextResponse {
      constructor(body, init = {}) {
        this._body = body;
        this.status = init.status || 200;
        this.headers = new Map(Object.entries(init.headers || {}));
      }
      async json() { return this._body; }
      static json(body, init = {}) { return new NextResponse(body, init); }
    }
  `,
  "stripe": `export default class Stripe {}`,
  "zod": `
    function makeType(parseFn) {
      return {
        _parse: parseFn,
        trim() { return makeType((v) => { const r = parseFn(v); if (!r.ok) return r; return { ok: true, data: typeof r.data === "string" ? r.data.trim() : r.data }; }); },
        min(n) { return makeType((v) => { const r = parseFn(v); if (!r.ok) return r; if ((typeof r.data === "string" || Array.isArray(r.data)) && r.data.length < n) return { ok: false }; return r; }); },
        max(n) { return makeType((v) => { const r = parseFn(v); if (!r.ok) return r; if ((typeof r.data === "string" || Array.isArray(r.data)) && r.data.length > n) return { ok: false }; return r; }); },
        optional() { return makeType((v) => v === undefined ? { ok: true, data: undefined } : parseFn(v)); },
        default(defVal) { return makeType((v) => v === undefined ? { ok: true, data: defVal } : parseFn(v)); },
        safeParse(v) { const r = parseFn(v); return r.ok ? { success: true, data: r.data } : { success: false, error: new Error("INVALID") }; }
      };
    }
    export const z = {
      string: () => makeType((v) => typeof v === "string" ? { ok: true, data: v } : { ok: false }),
      boolean: () => makeType((v) => typeof v === "boolean" ? { ok: true, data: v } : { ok: false }),
      enum: (vals) => makeType((v) => vals.includes(v) ? { ok: true, data: v } : { ok: false }),
      array: (item) => makeType((v) => {
        if (!Array.isArray(v)) return { ok: false };
        const out = [];
        for (const el of v) { const r = item._parse(el); if (!r.ok) return { ok: false }; out.push(r.data); }
        return { ok: true, data: out };
      }),
      object: (shape) => makeType((v) => {
        if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false };
        const out = {};
        for (const [k, schema] of Object.entries(shape)) {
          const r = schema._parse(v[k]);
          if (!r.ok) return { ok: false };
          if (r.data !== undefined) out[k] = r.data;
        }
        return { ok: true, data: out };
      })
    };
  `,
  "@/lib/db": `
    const s = globalThis.__adseeqTestState;
    let idSeq = 1;
    export const prisma = {
      plan: {
        async findUnique({ where }) {
          return s.plans.get(where.code) || null;
        }
      },
      subscription: {
        async findFirst({ where }) {
          for (const sub of s.subscriptions.values()) {
            if (where.providerSubscriptionId && sub.providerSubscriptionId === where.providerSubscriptionId) return sub;
          }
          return null;
        },
        async upsert({ where, create, update }) {
          const existing = s.subscriptions.get(where.userId);
          const next = existing ? { ...existing, ...update } : { id: "sub_" + (idSeq++), ...create };
          s.subscriptions.set(where.userId, next);
          return next;
        },
        async updateMany({ where, data }) {
          const existing = s.subscriptions.get(where.userId);
          if (!existing) return { count: 0 };
          s.subscriptions.set(where.userId, { ...existing, ...data });
          return { count: 1 };
        }
      },
      payment: {
        async upsert({ where, create, update }) {
          const existing = s.payments.get(where.externalId);
          const next = existing ? { ...existing, ...update } : { id: "pay_" + (idSeq++), ...create };
          s.payments.set(where.externalId, next);
          return next;
        }
      },
      usageCounter: {
        async upsert({ where, create, update }) {
          const k = where.userId_metric_periodKey;
          const key = k.userId + "|" + k.metric + "|" + k.periodKey;
          const existing = s.usageCounters.get(key);
          if (existing) {
            const next = { ...existing, ...update };
            s.usageCounters.set(key, next);
            return next;
          }
          const created = { id: key, ...create };
          s.usageCounters.set(key, created);
          return created;
        },
        async updateMany({ where, data }) {
          const counter = s.usageCounters.get(where.id);
          if (!counter) return { count: 0 };
          if (where.used?.lte !== undefined && counter.used > where.used.lte) return { count: 0 };
          counter.used += data.used.increment;
          counter.limit = data.limit;
          counter.resetAt = data.resetAt;
          return { count: 1 };
        },
        async findUniqueOrThrow({ where }) {
          const counter = s.usageCounters.get(where.id);
          if (!counter) throw new Error("NOT_FOUND");
          return { ...counter };
        },
        async findUnique({ where }) {
          const k = where.userId_metric_periodKey;
          const key = k.userId + "|" + k.metric + "|" + k.periodKey;
          const counter = s.usageCounters.get(key);
          return counter ? { ...counter } : null;
        },
        async update({ where, data }) {
          const counter = s.usageCounters.get(where.id);
          if (!counter) throw new Error("NOT_FOUND");
          Object.assign(counter, data);
          return { ...counter };
        },
        async findMany({ where }) {
          return [...s.usageCounters.values()].filter((row) => row.userId === where.userId);
        }
      },
      ad: {
        async findMany({ where } = {}) {
          const all = [...s.ads.values()];
          if (where?.brandPageId) return all.filter((ad) => ad.brandPageId === where.brandPageId);
          return all;
        },
        async findUnique({ where }) { return s.ads.get(where.id) || null; }
      },
      brandPage: {
        async findMany({ where }) {
          const ids = where?.id?.in || [];
          return ids.map((id) => s.brandPages.get(id)).filter(Boolean);
        },
        async update({ where, data }) {
          const bp = s.brandPages.get(where.id);
          if (!bp) throw new Error("NOT_FOUND");
          const updated = { ...bp, ...data };
          s.brandPages.set(where.id, updated);
          return updated;
        }
      },
      aiAnalysis: {
        async create({ data }) {
          const row = { id: "ai_" + (idSeq++), ...data };
          s.aiAnalyses.push(row);
          return row;
        }
      }
    };
  `,
  "@/lib/auth/current-user": `
    export async function currentUser() {
      return globalThis.__adseeqTestState.user;
    }
  `,
  "@/lib/stripe": `
    const s = globalThis.__adseeqTestState;
    export function stripeClient() {
      return {
        webhooks: {
          constructEvent(raw) {
            const parsed = JSON.parse(raw);
            if (parsed.invalidSig) throw new Error("INVALID");
            return parsed;
          }
        },
        subscriptions: {
          async retrieve(id) {
            s.calls.stripeRetrieve++;
            return s.stripeSubscriptions.get(id);
          }
        }
      };
    }
  `,
  "@/lib/openai-analysis": `
    const s = globalThis.__adseeqTestState;
    export async function analyzeCreatives() {
      s.calls.analyzeCreatives++;
      if (s.failures.analyzeCreatives) throw new Error(s.failures.analyzeCreatives);
      return { model: "gpt-5", summary: "ok", insights: [{ title: "t", action: "a", confidence: 0.9 }] };
    }
    export async function analyzeWinningAd() {
      s.calls.analyzeWinningAd++;
      if (s.failures.analyzeWinningAd) throw new Error(s.failures.analyzeWinningAd);
      return {
        model: "gpt-5",
        verdict: "good",
        whyItWins: ["a", "b"],
        hook: "h",
        offer: "o",
        audience: "aud",
        variations: [
          { title: "v1", hook: "h1", headline: "hl1", primaryText: "p1", visualIdea: "vi1", market: "TR" },
          { title: "v2", hook: "h2", headline: "hl2", primaryText: "p2", visualIdea: "vi2", market: "TR" },
          { title: "v3", hook: "h3", headline: "hl3", primaryText: "p3", visualIdea: "vi3", market: "TR" }
        ],
        testPlan: ["t1", "t2"],
        landingPageReview: { summary: "ok", strengths: [], weaknesses: [], fixes: [] }
      };
    }
    export async function analyzeAccountAds() {
      s.calls.analyzeAccountAds++;
      if (s.failures.analyzeAccountAds) throw new Error(s.failures.analyzeAccountAds);
      return { model: "gpt-5", summary: "ok", insights: [{ title: "t", action: "a", confidence: 0.9 }] };
    }
  `,
  "@/lib/web-page": `
    const s = globalThis.__adseeqTestState;
    export async function fetchPublicPage(url) {
      s.calls.fetchPublicPage++;
      return { url, html: "<h1>Hi</h1>", text: "Hi", links: [], title: "Hi", description: null, via: "firecrawl" };
    }
    export function summarizeLandingPage(page) {
      return { url: page.url, title: page.title, description: null, headings: ["Hi"], ctas: [], prices: [], offers: [], trustSignals: [], excerpt: "Hi", via: page.via };
    }
  `,
  "@/lib/contact-finder": `
    const s = globalThis.__adseeqTestState;
    export async function findContacts(website) {
      s.calls.findContacts++;
      return { website, emails: ["info@" + website], phones: [], socials: [], source: "apify" };
    }
  `,
  "@/lib/meta-account": `
    const s = globalThis.__adseeqTestState;
    export const META_DATE_PRESETS = ["last_7d", "last_14d", "last_30d", "last_90d"];
    export function normalizeAdAccountId(value) {
      const digits = value.replace(/^act_/, "");
      return /^\\d+$/.test(digits) ? "act_" + digits : null;
    }
    export async function fetchAccountInsights() {
      s.calls.fetchAccountInsights++;
      if (s.failures.fetchAccountInsights) throw new Error(s.failures.fetchAccountInsights);
      return s.metaInsightsRows;
    }
    export function classifyAccountAds(rows) {
      return rows.map((row) => ({
        adId: row.ad_id || "1",
        adName: row.ad_name || "Ad",
        campaignName: "Camp",
        spend: 100,
        impressions: 1000,
        ctr: 2,
        conversions: 5,
        cpa: 20,
        roas: 3,
        verdict: "TUTUYOR",
        reasons: ["ok"]
      }));
    }
  `
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier in virtualModules) {
      return { shortCircuit: true, url: `virtual:${specifier}` };
    }
    if (specifier.startsWith("@/")) {
      const target = path.join(rootDir, "src", `${specifier.slice(2)}.ts`);
      return { shortCircuit: true, url: pathToFileURL(target).href };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file://") && !specifier.endsWith(".ts") && !specifier.endsWith(".mjs")) {
      const candidate = path.resolve(path.dirname(fileURLToPath(context.parentURL)), `${specifier}.ts`);
      if (fs.existsSync(candidate)) {
        return { shortCircuit: true, url: pathToFileURL(candidate).href };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith("virtual:")) {
      const name = url.slice("virtual:".length);
      return { shortCircuit: true, format: "module", source: virtualModules[name] };
    }
    if (url.startsWith("file://") && url.endsWith(".ts")) {
      const source = fs.readFileSync(new URL(url), "utf8");
      return {
        shortCircuit: true,
        format: "module",
        source: stripTypeScriptTypes(source)
      };
    }
    return nextLoad(url, context);
  }
});

const plansMod = await import(pathToFileURL(path.join(rootDir, "src/lib/plans.ts")).href);
const webhookMod = await import(pathToFileURL(path.join(rootDir, "src/app/api/billing/webhook/route.ts")).href);
const magicAiMod = await import(pathToFileURL(path.join(rootDir, "src/app/api/magic-ai/analyze/route.ts")).href);
const metaInsightsMod = await import(pathToFileURL(path.join(rootDir, "src/app/api/meta-account/insights/route.ts")).href);
const winnerAnalysisMod = await import(pathToFileURL(path.join(rootDir, "src/app/api/ads/[id]/winner-analysis/route.ts")).href);
const contactsMod = await import(pathToFileURL(path.join(rootDir, "src/app/api/stopped-advertisers/contacts/route.ts")).href);
const authMeMod = await import(pathToFileURL(path.join(rootDir, "src/app/api/auth/me/route.ts")).href);

const FREE_DB_PLAN = {
  id: "plan_free",
  code: "FREE",
  name: "Free",
  features: { adsSearchDaily: 10, apiCreditsMonthly: 0, trackedStores: 0, followedBrands: 0 }
};
const BASIC_DB_PLAN = {
  id: "plan_basic",
  code: "BASIC",
  name: "Basic",
  features: { adsSearchDaily: 100, apiCreditsMonthly: 10, trackedStores: 25, followedBrands: 2 }
};
const PREMIUM_DB_PLAN = {
  id: "plan_premium",
  code: "PREMIUM",
  name: "Premium",
  features: { adsSearchDaily: 2000, apiCreditsMonthly: 20000, trackedStores: 500, followedBrands: 200 }
};

let reqSeq = 1;
function jsonRequest(url, body, headers = {}) {
  const ip = `203.0.113.${(reqSeq++ % 200) + 1}`;
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip, ...headers },
    body: JSON.stringify(body)
  });
}

function resetState() {
  state.user = null;
  state.plans = new Map([
    ["FREE", FREE_DB_PLAN],
    ["BASIC", BASIC_DB_PLAN],
    ["PREMIUM", PREMIUM_DB_PLAN]
  ]);
  state.subscriptions = new Map();
  state.payments = new Map();
  state.usageCounters = new Map();
  state.ads = new Map([
    [
      "ad_1",
      {
        id: "ad_1",
        brandPageId: "bp_1",
        headline: "Winning product",
        primaryText: "Buy now",
        description: null,
        ctaText: "Shop",
        landingUrl: "https://example.shop/p",
        mediaType: "VIDEO",
        daysRunning: 45,
        status: "ACTIVE",
        countries: ["TR"],
        brandPage: { name: "Brand A" },
        raw: null
      }
    ]
  ]);
  state.brandPages = new Map([
    ["bp_uncached_1", { id: "bp_uncached_1", websiteDomain: "brand1.test", contactEmails: [], contactPhones: [], contactSocials: [], contactSource: null, contactCheckedAt: null }],
    ["bp_uncached_2", { id: "bp_uncached_2", websiteDomain: "brand2.test", contactEmails: [], contactPhones: [], contactSocials: [], contactSource: null, contactCheckedAt: null }],
    ["bp_cached", { id: "bp_cached", websiteDomain: "cached.test", contactEmails: ["hi@cached.test"], contactPhones: [], contactSocials: [], contactSource: "site", contactCheckedAt: new Date() }],
    ["bp_noweb", { id: "bp_noweb", websiteDomain: null, contactEmails: [], contactPhones: [], contactSocials: [], contactSource: null, contactCheckedAt: null }]
  ]);
  state.aiAnalyses = [];
  state.stripeSubscriptions = new Map();
  for (const key of Object.keys(state.calls)) state.calls[key] = 0;
  for (const key of Object.keys(state.failures)) state.failures[key] = null;
  state.metaInsightsRows = [{ ad_id: "m1", ad_name: "Meta Ad 1" }];
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
}

function monthUsage(userId) {
  const monthKey = new Date().toISOString().slice(0, 7);
  return state.usageCounters.get(`${userId}|api_credits_monthly|${monthKey}`)?.used || 0;
}

test("Finding 1: planFromUser enforces Subscription.status and currentPeriodEnd and /api/auth/me reflects effective plan", async () => {
  resetState();
  const future = new Date(Date.now() + 86_400_000);
  const past = new Date(Date.now() - 86_400_000);

  assert.equal(plansMod.planFromUser({ subscription: null }).code, "FREE");
  assert.equal(plansMod.planFromUser({ subscription: { status: "ACTIVE", currentPeriodEnd: future, plan: PREMIUM_DB_PLAN } }).code, "PREMIUM");
  assert.equal(plansMod.planFromUser({ subscription: { status: "TRIALING", currentPeriodEnd: future, plan: BASIC_DB_PLAN } }).code, "BASIC");
  assert.equal(plansMod.planFromUser({ subscription: { status: "ACTIVE", currentPeriodEnd: null, plan: BASIC_DB_PLAN } }).code, "BASIC");

  for (const badStatus of ["PAST_DUE", "CANCELED", "EXPIRED"]) {
    const plan = plansMod.planFromUser({ subscription: { status: badStatus, currentPeriodEnd: future, plan: PREMIUM_DB_PLAN } });
    assert.equal(plan.code, "FREE", `${badStatus} must fall back to FREE`);
    assert.equal(plan.features.apiCreditsMonthly, 0);
  }
  assert.equal(plansMod.planFromUser({ subscription: { status: "ACTIVE", currentPeriodEnd: past, plan: PREMIUM_DB_PLAN } }).code, "FREE");

  state.user = {
    id: "u1",
    email: "u1@test.local",
    name: "User 1",
    role: "USER",
    creditBalance: 0,
    subscription: { status: "CANCELED", currentPeriodEnd: future, plan: PREMIUM_DB_PLAN }
  };
  const meRes = await authMeMod.GET();
  const meBody = await meRes.json();
  assert.equal(meBody.user.plan, "FREE");
});

test("Finding 1: Stripe webhook verifies payment_status === 'paid' and never grants paid planId on incomplete/canceled/past_due subscriptions", async () => {
  resetState();

  // 1) checkout.session.completed with payment_status: "unpaid" must NOT mark PAID or sync subscription
  state.stripeSubscriptions.set("sub_paid_later", {
    id: "sub_paid_later",
    status: "active",
    customer: "cus_1",
    cancel_at_period_end: false,
    metadata: { userId: "u_stripe", planCode: "PREMIUM", billingInterval: "monthly" },
    items: { data: [{ current_period_start: 1700000000, current_period_end: 1900000000 }] }
  });
  const unpaidRes = await webhookMod.POST(
    jsonRequest("https://example.test/api/billing/webhook", {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_unpaid",
          payment_status: "unpaid",
          amount_total: 21200,
          currency: "eur",
          metadata: { userId: "u_stripe", planCode: "PREMIUM" },
          subscription: "sub_paid_later"
        }
      }
    }, { "stripe-signature": "sig" })
  );
  assert.equal(unpaidRes.status, 200);
  assert.equal(state.payments.get("cs_unpaid")?.status, "PENDING");
  assert.equal(state.payments.get("cs_unpaid")?.paidAt, null);
  assert.equal(state.calls.stripeRetrieve, 0);
  assert.equal(state.subscriptions.has("u_stripe"), false);

  // 2) customer.subscription.created with status: "incomplete" must NOT grant paid planId
  await webhookMod.POST(
    jsonRequest("https://example.test/api/billing/webhook", {
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_inc",
          status: "incomplete",
          customer: "cus_1",
          cancel_at_period_end: false,
          metadata: { userId: "u_stripe", planCode: "PREMIUM", billingInterval: "monthly" },
          items: { data: [] }
        }
      }
    }, { "stripe-signature": "sig" })
  );
  assert.equal(state.subscriptions.has("u_stripe"), false);

  // 3) checkout.session.completed with payment_status: "paid" DOES mark PAID and activates subscription
  await webhookMod.POST(
    jsonRequest("https://example.test/api/billing/webhook", {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_paid",
          payment_status: "paid",
          amount_total: 21200,
          currency: "eur",
          metadata: { userId: "u_stripe", planCode: "PREMIUM" },
          subscription: "sub_paid_later"
        }
      }
    }, { "stripe-signature": "sig" })
  );
  assert.equal(state.payments.get("cs_paid")?.status, "PAID");
  assert.equal(state.subscriptions.get("u_stripe")?.planId, "plan_premium");
  assert.equal(state.subscriptions.get("u_stripe")?.status, "ACTIVE");

  // 4) customer.subscription.updated with status: "past_due" downgrades planId to FREE
  await webhookMod.POST(
    jsonRequest("https://example.test/api/billing/webhook", {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_paid_later",
          status: "past_due",
          customer: "cus_1",
          cancel_at_period_end: false,
          metadata: { userId: "u_stripe", planCode: "PREMIUM", billingInterval: "monthly" },
          items: { data: [] }
        }
      }
    }, { "stripe-signature": "sig" })
  );
  assert.equal(state.subscriptions.get("u_stripe")?.planId, "plan_free");
  assert.equal(state.subscriptions.get("u_stripe")?.status, "PAST_DUE");

  // 5) customer.subscription.deleted downgrades planId to FREE and sets CANCELED
  await webhookMod.POST(
    jsonRequest("https://example.test/api/billing/webhook", {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_paid_later",
          status: "canceled",
          customer: "cus_1",
          cancel_at_period_end: true,
          metadata: { userId: "u_stripe", planCode: "PREMIUM", billingInterval: "monthly" },
          items: { data: [] }
        }
      }
    }, { "stripe-signature": "sig" })
  );
  assert.equal(state.subscriptions.get("u_stripe")?.planId, "plan_free");
  assert.equal(state.subscriptions.get("u_stripe")?.status, "CANCELED");
});

test("Finding 2: /api/magic-ai/analyze enforces paid plan, consumes api_credits_monthly, and refunds on failure", async () => {
  resetState();

  // FREE user blocked before OpenAI
  state.user = { id: "u_free", role: "USER", subscription: { status: "ACTIVE", currentPeriodEnd: null, plan: FREE_DB_PLAN } };
  let res = await magicAiMod.POST(jsonRequest("https://example.test/api/magic-ai/analyze", { query: "dog" }));
  assert.equal(res.status, 402);
  assert.equal((await res.json()).error, "PLAN_REQUIRED");
  assert.equal(state.calls.analyzeCreatives, 0);

  // CANCELED paid user blocked before OpenAI
  state.user = { id: "u_canceled", role: "USER", subscription: { status: "CANCELED", currentPeriodEnd: new Date(Date.now() + 86_400_000), plan: PREMIUM_DB_PLAN } };
  res = await magicAiMod.POST(jsonRequest("https://example.test/api/magic-ai/analyze", {}));
  assert.equal(res.status, 402);
  assert.equal(state.calls.analyzeCreatives, 0);

  // Active BASIC user (10 credits): 2 calls succeed (10 used), 3rd blocked with 403 API_CREDITS_EXCEEDED
  state.user = { id: "u_basic", role: "USER", subscription: { status: "ACTIVE", currentPeriodEnd: null, plan: BASIC_DB_PLAN } };
  assert.equal((await magicAiMod.POST(jsonRequest("https://example.test/api/magic-ai/analyze", {}))).status, 200);
  assert.equal(monthUsage("u_basic"), 5);
  assert.equal((await magicAiMod.POST(jsonRequest("https://example.test/api/magic-ai/analyze", {}))).status, 200);
  assert.equal(monthUsage("u_basic"), 10);
  res = await magicAiMod.POST(jsonRequest("https://example.test/api/magic-ai/analyze", {}));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, "API_CREDITS_EXCEEDED");
  assert.equal(state.calls.analyzeCreatives, 2);

  // Refund on OpenAI failure
  state.user = { id: "u_refund", role: "USER", subscription: { status: "ACTIVE", currentPeriodEnd: null, plan: BASIC_DB_PLAN } };
  state.failures.analyzeCreatives = "OPENAI_TIMEOUT";
  res = await magicAiMod.POST(jsonRequest("https://example.test/api/magic-ai/analyze", {}));
  assert.equal(res.status, 502);
  assert.equal(monthUsage("u_refund"), 0);
});

test("Finding 2: /api/meta-account/insights gates withAi on paid plan & api_credits_monthly while keeping withAi:false free", async () => {
  resetState();

  // FREE user can run withAi: false
  state.user = { id: "u_free_meta", role: "USER", subscription: { status: "ACTIVE", currentPeriodEnd: null, plan: FREE_DB_PLAN } };
  let res = await metaInsightsMod.POST(jsonRequest("https://example.test/api/meta-account/insights", {
    adAccountId: "123456789", accessToken: "x".repeat(30), withAi: false
  }));
  assert.equal(res.status, 200);
  assert.equal(state.calls.analyzeAccountAds, 0);

  // FREE / CANCELED user rejected when withAi: true before Meta or OpenAI calls
  res = await metaInsightsMod.POST(jsonRequest("https://example.test/api/meta-account/insights", {
    adAccountId: "123456789", accessToken: "x".repeat(30), withAi: true
  }));
  assert.equal(res.status, 402);
  assert.equal(state.calls.fetchAccountInsights, 1); // unchanged from previous call
  assert.equal(state.calls.analyzeAccountAds, 0);

  // BASIC user (10 credits) consumes 5 credits on withAi: true, refunds if ads.length === 0 or OpenAI fails
  state.user = { id: "u_basic_meta", role: "USER", subscription: { status: "ACTIVE", currentPeriodEnd: null, plan: BASIC_DB_PLAN } };
  res = await metaInsightsMod.POST(jsonRequest("https://example.test/api/meta-account/insights", {
    adAccountId: "123456789", accessToken: "x".repeat(30), withAi: true
  }));
  assert.equal(res.status, 200);
  assert.equal(monthUsage("u_basic_meta"), 5);

  // 0 ads returned -> refunded
  state.metaInsightsRows = [];
  res = await metaInsightsMod.POST(jsonRequest("https://example.test/api/meta-account/insights", {
    adAccountId: "123456789", accessToken: "x".repeat(30), withAi: true
  }));
  assert.equal(res.status, 200);
  assert.equal(monthUsage("u_basic_meta"), 5);

  // OpenAI fails -> refunded
  state.metaInsightsRows = [{ ad_id: "m1", ad_name: "Meta Ad 1" }];
  state.failures.analyzeAccountAds = "OPENAI_HTTP_500";
  res = await metaInsightsMod.POST(jsonRequest("https://example.test/api/meta-account/insights", {
    adAccountId: "123456789", accessToken: "x".repeat(30), withAi: true
  }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.aiError, "OPENAI_HTTP_500");
  assert.equal(monthUsage("u_basic_meta"), 5);

  // 2nd successful call hits 10/10, 3rd returns 403 API_CREDITS_EXCEEDED
  state.failures.analyzeAccountAds = null;
  res = await metaInsightsMod.POST(jsonRequest("https://example.test/api/meta-account/insights", {
    adAccountId: "123456789", accessToken: "x".repeat(30), withAi: true
  }));
  assert.equal(res.status, 200);
  assert.equal(monthUsage("u_basic_meta"), 10);

  res = await metaInsightsMod.POST(jsonRequest("https://example.test/api/meta-account/insights", {
    adAccountId: "123456789", accessToken: "x".repeat(30), withAi: true
  }));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, "API_CREDITS_EXCEEDED");
});

test("Finding 2: /api/ads/[id]/winner-analysis enforces active paid plan + api_credits_monthly + refund on error", async () => {
  resetState();
  const ctx = { params: Promise.resolve({ id: "ad_1" }) };

  // Expired active subscription is rejected as FREE
  state.user = {
    id: "u_expired",
    role: "USER",
    subscription: { status: "ACTIVE", currentPeriodEnd: new Date(Date.now() - 10_000), plan: PREMIUM_DB_PLAN }
  };
  let res = await winnerAnalysisMod.POST(jsonRequest("https://example.test/api/ads/ad_1/winner-analysis", {}), ctx);
  assert.equal(res.status, 402);
  assert.equal(state.calls.fetchPublicPage, 0);
  assert.equal(state.calls.analyzeWinningAd, 0);

  // Active BASIC user (10 credits): 2 analyses succeed, 3rd blocked before Firecrawl/OpenAI
  state.user = { id: "u_basic_win", role: "USER", subscription: { status: "ACTIVE", currentPeriodEnd: null, plan: BASIC_DB_PLAN } };
  assert.equal((await winnerAnalysisMod.POST(jsonRequest("https://example.test/api/ads/ad_1/winner-analysis", {}), ctx)).status, 200);
  assert.equal(monthUsage("u_basic_win"), 5);
  assert.equal((await winnerAnalysisMod.POST(jsonRequest("https://example.test/api/ads/ad_1/winner-analysis", {}), ctx)).status, 200);
  assert.equal(monthUsage("u_basic_win"), 10);
  res = await winnerAnalysisMod.POST(jsonRequest("https://example.test/api/ads/ad_1/winner-analysis", {}), ctx);
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, "API_CREDITS_EXCEEDED");
  assert.equal(state.calls.fetchPublicPage, 2);
  assert.equal(state.calls.analyzeWinningAd, 2);

  // Error refunds quota
  state.user = { id: "u_win_err", role: "USER", subscription: { status: "ACTIVE", currentPeriodEnd: null, plan: BASIC_DB_PLAN } };
  state.failures.analyzeWinningAd = "OPENAI_NOT_CONFIGURED";
  res = await winnerAnalysisMod.POST(jsonRequest("https://example.test/api/ads/ad_1/winner-analysis", {}), ctx);
  assert.equal(res.status, 503);
  assert.equal(monthUsage("u_win_err"), 0);
});

test("Finding 2: /api/stopped-advertisers/contacts reserves per uncached brand, skips cached credits, and refunds no-website brands", async () => {
  resetState();

  // PAST_DUE user blocked before any contact lookups
  state.user = { id: "u_pastdue", role: "USER", subscription: { status: "PAST_DUE", currentPeriodEnd: null, plan: PREMIUM_DB_PLAN } };
  let res = await contactsMod.POST(jsonRequest("https://example.test/api/stopped-advertisers/contacts", { brandPageIds: ["bp_uncached_1"] }));
  assert.equal(res.status, 402);
  assert.equal(state.calls.findContacts, 0);

  // BASIC user (10 credits): cached brand consumes 0 credits even when remaining credits are used
  state.user = { id: "u_basic_contacts", role: "USER", subscription: { status: "ACTIVE", currentPeriodEnd: null, plan: BASIC_DB_PLAN } };

  // Request with 1 cached, 1 uncached with website, 1 uncached without website -> reserves 10, uses 5, refunds 5
  res = await contactsMod.POST(jsonRequest("https://example.test/api/stopped-advertisers/contacts", {
    brandPageIds: ["bp_cached", "bp_uncached_1", "bp_noweb"]
  }));
  assert.equal(res.status, 200);
  assert.equal(state.calls.findContacts, 1);
  assert.equal(monthUsage("u_basic_contacts"), 5);

  // Requesting 2 uncached brands with only 5 credits remaining -> rejected 403 before calling findContacts
  res = await contactsMod.POST(jsonRequest("https://example.test/api/stopped-advertisers/contacts", {
    brandPageIds: ["bp_uncached_1", "bp_uncached_2"],
    force: true
  }));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, "API_CREDITS_EXCEEDED");
  assert.equal(state.calls.findContacts, 1);

  // Cached brand still works when remaining credits = 5 (or even 0)
  res = await contactsMod.POST(jsonRequest("https://example.test/api/stopped-advertisers/contacts", {
    brandPageIds: ["bp_cached"]
  }));
  assert.equal(res.status, 200);
  assert.equal(state.calls.findContacts, 1);
  assert.equal(monthUsage("u_basic_contacts"), 5);
});

test("Finding 1 & 2 edge cases: no_payment_required, async_payment_succeeded/failed, unpaid/paused downgrade, and ADMIN bypass", async () => {
  resetState();

  // no_payment_required must NOT mark PAID
  await webhookMod.POST(
    jsonRequest("https://example.test/api/billing/webhook", {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_npr",
          payment_status: "no_payment_required",
          amount_total: 0,
          currency: "eur",
          metadata: { userId: "u_npr", planCode: "BASIC" },
          subscription: "sub_npr"
        }
      }
    }, { "stripe-signature": "sig" })
  );
  assert.equal(state.payments.get("cs_npr")?.status, "PENDING");
  assert.equal(state.calls.stripeRetrieve, 0);

  // async_payment_succeeded marks PAID and syncs subscription
  state.stripeSubscriptions.set("sub_async", {
    id: "sub_async",
    status: "trialing",
    customer: "cus_async",
    cancel_at_period_end: false,
    metadata: { userId: "u_async", planCode: "BASIC", billingInterval: "monthly" },
    items: { data: [{ current_period_start: 1700000000, current_period_end: 1900000000 }] }
  });
  await webhookMod.POST(
    jsonRequest("https://example.test/api/billing/webhook", {
      type: "checkout.session.async_payment_succeeded",
      data: {
        object: {
          id: "cs_async",
          payment_status: "paid",
          amount_total: 4200,
          currency: "eur",
          metadata: { userId: "u_async", planCode: "BASIC" },
          subscription: "sub_async"
        }
      }
    }, { "stripe-signature": "sig" })
  );
  assert.equal(state.payments.get("cs_async")?.status, "PAID");
  assert.equal(state.subscriptions.get("u_async")?.planId, "plan_basic");
  assert.equal(state.subscriptions.get("u_async")?.status, "TRIALING");

  // unpaid & paused downgrade to FREE
  for (const [stripeStatus, expectedStatus] of [["unpaid", "PAST_DUE"], ["paused", "EXPIRED"], ["incomplete_expired", "CANCELED"]]) {
    await webhookMod.POST(
      jsonRequest("https://example.test/api/billing/webhook", {
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_async",
            status: stripeStatus,
            customer: "cus_async",
            cancel_at_period_end: false,
            metadata: { userId: "u_async", planCode: "BASIC", billingInterval: "monthly" },
            items: { data: [] }
          }
        }
      }, { "stripe-signature": "sig" })
    );
    assert.equal(state.subscriptions.get("u_async")?.planId, "plan_free");
    assert.equal(state.subscriptions.get("u_async")?.status, expectedStatus);
  }

  // async_payment_failed marks FAILED
  await webhookMod.POST(
    jsonRequest("https://example.test/api/billing/webhook", {
      type: "checkout.session.async_payment_failed",
      data: {
        object: {
          id: "cs_fail",
          payment_status: "unpaid",
          amount_total: 4200,
          currency: "eur",
          metadata: { userId: "u_async", planCode: "BASIC" }
        }
      }
    }, { "stripe-signature": "sig" })
  );
  assert.equal(state.payments.get("cs_fail")?.status, "FAILED");

  // ADMIN bypasses plan & quota checks without consuming usage
  state.user = { id: "u_admin", role: "ADMIN", subscription: null };
  assert.equal((await magicAiMod.POST(jsonRequest("https://example.test/api/magic-ai/analyze", {}))).status, 200);
  assert.equal((await metaInsightsMod.POST(jsonRequest("https://example.test/api/meta-account/insights", {
    adAccountId: "123456789", accessToken: "x".repeat(30), withAi: true
  }))).status, 200);
  assert.equal((await winnerAnalysisMod.POST(jsonRequest("https://example.test/api/ads/ad_1/winner-analysis", {}), { params: Promise.resolve({ id: "ad_1" }) })).status, 200);
  assert.equal((await contactsMod.POST(jsonRequest("https://example.test/api/stopped-advertisers/contacts", { brandPageIds: ["bp_uncached_1"] }))).status, 200);
  assert.equal(monthUsage("u_admin"), 0);
});
