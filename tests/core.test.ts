import assert from "node:assert/strict";
import test from "node:test";
import { MediaType } from "@prisma/client";
import { actorInput, normalizeApifyAd, selectMediaRecordsForSearch } from "../src/lib/apify";
import { adSearchDatabaseTerms, adSearchRelevance, filterRelevantAds } from "../src/lib/ad-search";
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
import { ConversionSignalAd, detectOffers, extractPriceTry, normalizeLandingUrl, rankProductsByConversionCost } from "../src/lib/conversion-finder";

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

test("veritabanı araması Türkçe karakterli ve ASCII yazımları birlikte tarar", () => {
  assert.deepEqual(adSearchDatabaseTerms("çeviri", "ALL_WORDS"), [["çeviri", "ceviri"]]);
  assert.deepEqual(adSearchDatabaseTerms("hızlı çeviri", "EXACT_PHRASE"), [["hızlı çeviri", "hızlı ceviri"]]);
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

test("dönüşüm bulucu Türkçe fiyat ve teklif sinyallerini çıkarır", () => {
  assert.equal(extractPriceTry("Sadece ₺1.299,90 yerine 799,90 TL! Ücretsiz kargo, kapıda ödeme"), 799.9);
  assert.equal(extractPriceTry("Kampanyayı kaçırma"), null);
  assert.deepEqual(detectOffers("Ücretsiz kargo ve kapıda ödeme, %40 indirim, sınırlı stok"), ["Ücretsiz kargo", "Kapıda ödeme", "İndirim", "Aciliyet"]);
  assert.equal(normalizeLandingUrl("https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.magaza.com%2Furun%2Fakilli-tasma%3Futm_source%3Dfb")?.canonical, "https://magaza.com/urun/akilli-tasma");
});

test("dönüşüm bulucu ürünleri gruplar ve düşük maliyet endeksini öne alır", () => {
  const base = { description: null, productUrl: null, firstSeenAt: null, brandLogoUrl: null, thumbnailUrl: null, brandPageId: "brand-1", brandName: "Marka" };
  const ads: ConversionSignalAd[] = [
    { ...base, id: "a1", headline: "Akıllı Tasma", primaryText: "₺499 ücretsiz kargo, kapıda ödeme", landingUrl: "https://magaza.com/urun/akilli-tasma?utm=1", mediaType: "VIDEO", status: "ACTIVE", daysRunning: 90 },
    { ...base, id: "a2", headline: "Akıllı Tasma", primaryText: "Son gün %30 indirim", landingUrl: "https://www.magaza.com/urun/akilli-tasma/", mediaType: "VIDEO", status: "ACTIVE", daysRunning: 40 },
    { ...base, id: "a3", headline: "Lüks Saat", primaryText: "₺12.500", landingUrl: "https://magaza.com/urun/luks-saat", mediaType: "IMAGE", status: "INACTIVE", daysRunning: 3 }
  ];
  const ranked = rankProductsByConversionCost(ads, 100);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].productName, "Akıllı Tasma");
  assert.equal(ranked[0].adCount, 2);
  assert.equal(ranked[0].priceTry, 499);
  assert.ok(ranked[0].costIndex < ranked[1].costIndex);
  assert.ok(ranked[0].estimatedCpaTry && ranked[0].estimatedCpaTry.min < ranked[0].estimatedCpaTry.max);
  assert.equal(ranked[0].band === "COK_DUSUK" || ranked[0].band === "DUSUK", true);
  assert.equal(ranked[1].band === "ORTA" || ranked[1].band === "YUKSEK", true);
});

import { rankWinners, scoreWinner } from "../src/lib/winner-score";
import { findStoppedAdvertisers, landingHost, outreachMessage, stoppedAdvertisersCsv } from "../src/lib/stopped-advertisers";
import { classifyAccountAds, normalizeAdAccountId } from "../src/lib/meta-account";

test("uzun süredir aktif, çok varyasyonlu ve çok platformlu reklam kazanan sayılır", () => {
  const winner = scoreWinner({ id: "a", brandPageId: "b", status: "ACTIVE", daysRunning: 120, headline: "Halı yıkama", primaryText: null, landingUrl: null, raw: { publisherPlatforms: ["facebook", "instagram", "messenger", "audience_network"] } }, 6);
  assert.equal(winner.tier, "KAZANAN");
  assert.equal(winner.score, 100);
  const loser = scoreWinner({ id: "c", brandPageId: "b", status: "INACTIVE", daysRunning: 3, headline: "Deneme", primaryText: null, landingUrl: null });
  assert.equal(loser.tier, "TEST");
});

test("aynı markanın aynı mesajlı reklamları varyasyon olarak sayılır", () => {
  const base = { brandPageId: "b", status: "ACTIVE", daysRunning: 30, primaryText: null, landingUrl: null };
  const ranked = rankWinners([
    { ...base, id: "1", headline: "Turn any picture to video" },
    { ...base, id: "2", headline: "Turn any picture to video!" },
    { ...base, id: "3", headline: "Başka mesaj" }
  ]);
  assert.equal(ranked.find((item) => item.ad.id === "1")?.winner.variantCount, 2);
  assert.equal(ranked.find((item) => item.ad.id === "3")?.winner.variantCount, 1);
});

test("hiç aktif reklamı kalmamış marka reklamı durmuş sayılır", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  const ad = { brandName: "Çağrı Market", brandLogoUrl: null, brandPageUrl: "https://facebook.com/x", brandWebsite: null, daysRunning: 40, firstSeenAt: null, headline: "İndirim", countries: ["TR"] };
  const results = findStoppedAdvertisers([
    { ...ad, brandPageId: "stopped", status: "INACTIVE", lastSeenAt: new Date("2026-09-21T00:00:00Z"), landingUrl: "https://www.cagrimarket.com/urun" },
    { ...ad, brandPageId: "stopped", status: "INACTIVE", lastSeenAt: new Date("2026-08-01T00:00:00Z"), landingUrl: "https://facebook.com/x" },
    { ...ad, brandPageId: "running", status: "ACTIVE", lastSeenAt: null, landingUrl: null },
    { ...ad, brandPageId: "running", status: "INACTIVE", lastSeenAt: null, landingUrl: null }
  ], now);
  assert.equal(results.length, 1);
  assert.equal(results[0]!.brandPageId, "stopped");
  assert.equal(results[0]!.website, "cagrimarket.com");
  assert.equal(results[0]!.daysSinceStopped, 10);
  assert.equal(landingHost("https://l.facebook.com/abc"), null);
  assert.match(outreachMessage(results[0]!), /2 reklamınızı/);
  assert.match(stoppedAdvertisersCsv(results), /cagrimarket\.com/);
});

test("Meta hesap reklamları hesap ortalamasına göre sınıflandırılır", () => {
  assert.equal(normalizeAdAccountId("123456789"), "act_123456789");
  assert.equal(normalizeAdAccountId("act_abc"), null);
  const rows = classifyAccountAds([
    { ad_id: "1", ad_name: "Kazanan", spend: "100", impressions: "10000", clicks: "300", actions: [{ action_type: "purchase", value: "10" }], action_values: [{ action_type: "purchase", value: "400" }] },
    { ad_id: "2", ad_name: "Orta", spend: "100", impressions: "10000", clicks: "150", actions: [{ action_type: "purchase", value: "5" }], action_values: [{ action_type: "purchase", value: "150" }] },
    { ad_id: "3", ad_name: "Yakan", spend: "100", impressions: "10000", clicks: "50", actions: [], action_values: [] },
    { ad_id: "4", ad_name: "Yeni", spend: "2", impressions: "200", clicks: "3" }
  ]);
  const verdict = (id: string) => rows.find((row) => row.adId === id)?.verdict;
  assert.equal(verdict("1"), "TUTUYOR");
  assert.equal(verdict("3"), "TUTMUYOR");
  assert.equal(verdict("4"), "VERI_AZ");
});

import { extractContacts, summarizeLandingPage, unwrapRedirectUrl } from "../src/lib/web-page";

test("web sitesinden e-posta, telefon, sosyal medya ve iletişim sayfası çıkarılır", () => {
  const html = `<a href="mailto:info@cagrihali.com?subject=x">Yaz</a> <a href="tel:+90 532 111 22 33">Ara</a>
    <a href="https://www.instagram.com/cagrihali/">IG</a> <a href="https://facebook.com/sharer/sharer.php?u=x">paylaş</a>
    <a href="/iletisim">İletişim</a> logo@2x.png destek@cagrihali.com test@example.com`;
  const links = ["mailto:info@cagrihali.com?subject=x", "tel:+90 532 111 22 33", "https://www.instagram.com/cagrihali/", "https://facebook.com/sharer/sharer.php?u=x", "https://cagrihali.com/iletisim"];
  const contacts = extractContacts(html, links, "https://www.cagrihali.com");
  assert.deepEqual(contacts.emails.sort(), ["destek@cagrihali.com", "info@cagrihali.com"]);
  assert.deepEqual(contacts.phones, ["+905321112233"]);
  assert.deepEqual(contacts.socials, ["https://www.instagram.com/cagrihali"]);
  assert.deepEqual(contacts.contactPages, ["https://cagrihali.com/iletisim"]);
});

test("hedef sayfadan başlık, buton, fiyat, teklif ve güven sinyalleri çıkarılır", () => {
  const html = `<html><head><title>Halı Yıkama</title><meta name="description" content="Kapıdan alım"></head><body>
    <h1>İstanbul'da halı yıkama</h1><h2>Ücretsiz kargo ile kapıdan alım</h2><button>Hemen Randevu Al</button>
    <p>Metrekaresi 45 TL. Müşteri yorumları ★★★★★ Memnuniyet garantisi</p></body></html>`;
  const summary = summarizeLandingPage({ url: "https://x.com", html, text: "İstanbul'da halı yıkama Ücretsiz kargo ile kapıdan alım Metrekaresi 45 TL. Müşteri yorumları ★★★★★ Memnuniyet garantisi", links: [], title: "Halı Yıkama", description: "Kapıdan alım", via: "direct" });
  assert.equal(summary.headings[0], "İstanbul'da halı yıkama");
  assert.deepEqual(summary.ctas, ["Hemen Randevu Al"]);
  assert.deepEqual(summary.prices, ["45 TL"]);
  assert.ok(summary.offers.includes("Ücretsiz kargo"));
  assert.ok(summary.trustSignals.includes("Müşteri yorumları") && summary.trustSignals.includes("Garanti"));
  assert.equal(unwrapRedirectUrl("https://l.facebook.com/l.php?u=https%3A%2F%2Fshop.com%2Fp&h=1"), "https://shop.com/p");
  assert.equal(landingHost("https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.shop.com%2Fp"), "shop.com");
});
