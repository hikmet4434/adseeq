import assert from "node:assert/strict";
import test from "node:test";
import { MediaType } from "@prisma/client";
import { normalizeApifyAd } from "../src/lib/apify";
import { getFeatureLimit } from "../src/lib/plans";
import { istemciIp, hizSiniriAsimi } from "../src/lib/rate-limit";
import { stripePriceFor } from "../src/lib/stripe";
import { tikTokActorInput } from "../src/lib/apify-tiktok";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";

test("Apify reklamı metin, medya ve ülke alanlarıyla normalize edilir", () => {
  const ad = normalizeApifyAd({
    adArchiveID: "123",
    pageID: "page-1",
    pageName: "Berber İstanbul",
    adText: "Yeni stilini keşfet",
    videoUrl: "https://cdn.example.com/ad.mp4",
    countries: ["TR"],
    adStatus: "ACTIVE"
  });
  assert.ok(ad);
  assert.equal(ad.externalAdId, "123");
  assert.equal(ad.mediaType, MediaType.VIDEO);
  assert.deepEqual(ad.countries, ["TR"]);
});

test("plan feature limiti metrik adına göre çözülür", () => {
  const plan = { features: { adsSearchDaily: 100, apiCreditsMonthly: 500 } } as never;
  assert.equal(getFeatureLimit(plan, "ads_search_daily"), 100);
  assert.equal(getFeatureLimit(plan, "api_credits_monthly"), 500);
  assert.equal(getFeatureLimit(plan, "unknown"), 0);
});

test("istemci IP'sinde güvenilir son proxy adresi kullanılır", () => {
  const request = new Request("https://example.com", { headers: { "x-forwarded-for": "198.51.100.1, 10.0.0.2" } });
  assert.equal(istemciIp(request), "10.0.0.2");
});

test("giriş hız sınırı on birinci isteği engeller", () => {
  const request = new Request("https://example.com", { headers: { "x-real-ip": `test-${Date.now()}` } });
  for (let i = 0; i < 10; i += 1) assert.equal(hizSiniriAsimi(request, "giris"), null);
  assert.equal(hizSiniriAsimi(request, "giris")?.status, 429);
});

test("Stripe fiyat kimliği env allowlist'inden okunur", () => {
  const previous = process.env.STRIPE_PRICE_BASIC_MONTHLY;
  process.env.STRIPE_PRICE_BASIC_MONTHLY = "price_test123";
  assert.equal(stripePriceFor("BASIC", "monthly"), "price_test123");
  process.env.STRIPE_PRICE_BASIC_MONTHLY = "invalid";
  assert.throws(() => stripePriceFor("BASIC", "monthly"), /STRIPE_PRICE_NOT_CONFIGURED/);
  if (previous === undefined) delete process.env.STRIPE_PRICE_BASIC_MONTHLY;
  else process.env.STRIPE_PRICE_BASIC_MONTHLY = previous;
});

test("TikTok aktör girdisi resmi şemadaki alanları kullanır", () => {
  assert.deepEqual(tikTokActorInput({ query: "phone case", region: "US", maxResults: 10 }), {
    keyword: "phone case", region: "US", maxItems: 10, addonProductDetails: false
  });
});

test("eski alan adı yol ve sorguyu koruyarak AdSeeQ'a yönlenir", () => {
  const request = new NextRequest("http://localhost/dashboard/ads?q=berber", {
    headers: { "x-forwarded-host": "kazananavci.seymata.com" }
  });
  const response = proxy(request);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://adseeq.com/dashboard/ads?q=berber");
});

test("AdSeeQ ana alan adı yönlendirilmez", () => {
  const request = new NextRequest("https://adseeq.com/dashboard/ads", {
    headers: { host: "adseeq.com" }
  });
  const response = proxy(request);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("location"), null);
});
