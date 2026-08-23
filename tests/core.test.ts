import assert from "node:assert/strict";
import test from "node:test";
import { MediaType } from "@prisma/client";
import { actorInput, normalizeApifyAd, selectMediaRecordsForSearch } from "../src/lib/apify";
import { adSearchRelevance, filterRelevantAds } from "../src/lib/ad-search";
import { getFeatureLimit } from "../src/lib/plans";
import { istemciIp, hizSiniriAsimi } from "../src/lib/rate-limit";
import { stripePriceFor } from "../src/lib/stripe";
import { tikTokActorInput } from "../src/lib/apify-tiktok";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
import { GET as llmsTxt } from "../src/app/llms.txt/route";
import { homeStructuredData, serializeJsonLd } from "../src/lib/seo";
import { isSafeMediaHostname } from "../src/lib/media-proxy";

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

test("sitemap yalnızca indekslenebilir herkese açık sayfaları içerir", () => {
  const urls = sitemap().map((entry) => entry.url);
  assert.deepEqual(urls, ["https://adseeq.com", "https://adseeq.com/pricing"]);
  assert.equal(new Set(urls).size, urls.length);
});

test("robots özel alanları engeller ve sitemap adresini bildirir", () => {
  const value = robots();
  assert.equal(value.sitemap, "https://adseeq.com/sitemap.xml");
  assert.deepEqual(value.rules, {
    userAgent: "*",
    allow: ["/", "/pricing", "/llms.txt"],
    disallow: ["/api/", "/dashboard/", "/login", "/register"]
  });
});

test("llms.txt ürün kapsamını düz metin olarak açıklar", async () => {
  const response = llmsTxt();
  const body = await response.text();
  assert.match(response.headers.get("content-type") || "", /^text\/plain/);
  assert.match(body, /Meta Ads Library/);
  assert.match(body, /https:\/\/adseeq\.com\/pricing/);
});

test("ana sayfa JSON-LD verisi yazılım ve SSS şemalarını içerir", () => {
  const value = serializeJsonLd(homeStructuredData);
  assert.match(value, /SoftwareApplication/);
  assert.match(value, /FAQPage/);
  assert.equal(value.includes("<"), false);
});

test("medya proxy'si yerel ve özel ağ hedeflerini reddeder", () => {
  assert.equal(isSafeMediaHostname("localhost"), false);
  assert.equal(isSafeMediaHostname("127.0.0.1"), false);
  assert.equal(isSafeMediaHostname("10.0.0.8"), false);
  assert.equal(isSafeMediaHostname("192.168.1.4"), false);
  assert.equal(isSafeMediaHostname("video.xx.fbcdn.net"), true);
});

test("Meta Apify aktörüne ülke ve video filtresi aktarılır", () => {
  assert.deepEqual(actorInput("aiscraperdev~facebook-meta-ads-library-scraper", {
    searchTerms: ["berber"],
    country: "TR",
    adActiveStatus: "ACTIVE",
    mediaType: "VIDEO",
    maxResults: 25,
    scrapeAdDetails: true,
    includeAboutPage: false,
    maxCostUsd: 0.2
  }), {
    searchQueries: ["berber"],
    countryCode: "TR",
    adStatus: "active",
    adType: "all",
    mediaType: "video",
    platform: "all",
    maxResults: 25
  });
});

test("Apify snake_case video alanı doğrudan video kreatifi olur", () => {
  const ad = normalizeApifyAd({ ad_id: "video-1", page_name: "Test", ad_format: "video", video_url: "https://video.xx.fbcdn.net/test.mp4" });
  assert.equal(ad?.mediaType, MediaType.VIDEO);
  assert.equal(ad?.creativeUrl, "https://video.xx.fbcdn.net/test.mp4");
});

test("reklam araması tam kelimeyi eşleştirir ve alakasız alt dizeleri dışarıda bırakır", () => {
  assert.ok(adSearchRelevance({ headline: "Translate every conversation" }, "translate", "ALL_WORDS") > 0);
  assert.equal(adSearchRelevance({ headline: "A translated guide" }, "translate", "ALL_WORDS"), 0);
  assert.equal(adSearchRelevance({ primaryText: "Unrelated summer sale" }, "translate", "ALL_WORDS"), 0);
});

test("arama sonuçları ilgililiğe göre sıralanıp istenen sayıda kesilir", () => {
  const ads = [
    { headline: null, primaryText: "Use translate today", brandName: "Other" },
    { headline: "Translate instantly", primaryText: "Use translate today", brandName: "Translate Pro" },
    { headline: "Unrelated", primaryText: "No matching word", brandName: "Other" }
  ];
  const result = filterRelevantAds(ads, "translate", "ALL_WORDS", 1);
  assert.equal(result.length, 1);
  assert.equal(result[0].headline, "Translate instantly");
});

test("Meta medya seçimi resmi kimliği önceler ve ilgili medya yedeğini sıfıra düşürmez", () => {
  const mediaRecords = [
    { ad_id: "fallback-1", ad_body_text: "Anında çeviri yap", ad_format: "video", video_url: "https://video.xx.fbcdn.net/fallback.mp4", page_name: "Çeviri" },
    { ad_id: "official-1", ad_body_text: "Çeviri uygulaması", ad_format: "video", video_url: "https://video.xx.fbcdn.net/official.mp4", page_name: "Dil" },
    { ad_id: "image-1", ad_body_text: "Çeviri uygulaması", ad_format: "image", image_url: "https://scontent.xx.fbcdn.net/image.jpg", page_name: "Dil" }
  ];
  const selection = selectMediaRecordsForSearch(mediaRecords, [{ adArchiveID: "official-1" }], "çeviri", "ALL_WORDS", "VIDEO", 2);
  assert.deepEqual(selection.records.map((record) => record.ad_id), ["official-1", "fallback-1"]);
  assert.equal(selection.officialMatches, 1);
  assert.equal(selection.fallbackMatches, 1);
});
