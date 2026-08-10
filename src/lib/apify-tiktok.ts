import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Row = Record<string, unknown>;
const API_BASE = "https://api.apify.com/v2";
const DEFAULT_ACTOR = "toolzerhub~tiktok-shop-products-scraper";

function text(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function number(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/[^0-9.-]/g, "")) : NaN;
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function nested(row: Row, key: string) {
  const value = row[key];
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function safeUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.toString() : null;
  } catch { return null; }
}

export async function runTikTokShopActor(input: { query: string; region: string; maxResults: number }) {
  const token = process.env.APIFY_TOKEN?.trim();
  if (!token) throw new Error("APIFY_NOT_CONFIGURED");
  const actor = (process.env.APIFY_TIKTOK_ACTOR_ID?.trim() || DEFAULT_ACTOR).replace("/", "~");
  if (!/^[a-zA-Z0-9_-]+~[a-zA-Z0-9_-]+$/.test(actor)) throw new Error("APIFY_TIKTOK_ACTOR_INVALID");
  const params = new URLSearchParams({ clean: "true", timeout: "180", maxItems: String(input.maxResults), maxTotalChargeUsd: String(Math.max(0.1, input.maxResults * 0.01)) });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 210_000);
  try {
    const response = await fetch(`${API_BASE}/actors/${actor}/run-sync-get-dataset-items?${params}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(tikTokActorInput(input)),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`APIFY_TIKTOK_HTTP_${response.status}`);
    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) throw new Error("APIFY_TIKTOK_INVALID_RESPONSE");
    return payload.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("APIFY_TIKTOK_TIMEOUT");
    throw error;
  } finally { clearTimeout(timer); }
}

export function tikTokActorInput(input: { query: string; region: string; maxResults: number }) {
  return { keyword: input.query, region: input.region, maxItems: input.maxResults, addonProductDetails: false };
}

export async function importTikTokProducts(rows: Row[], region: string) {
  let imported = 0;
  let failed = 0;
  for (const row of rows) {
    const product = nested(row, "product");
    const shop = { ...nested(row, "shop"), ...nested(row, "seller") };
    const externalId = text(row, "productId", "product_id", "id") || text(product, "productId", "product_id", "id");
    const title = text(row, "title", "productTitle", "name") || text(product, "title", "name");
    if (!externalId || !title) { failed += 1; continue; }
    try {
      await prisma.tikTokProduct.upsert({
        where: { externalId },
        create: {
          externalId, title, description: text(row, "description") || text(product, "description"),
          productUrl: safeUrl(text(row, "productUrl", "url") || text(product, "productUrl", "url")),
          imageUrl: safeUrl(text(row, "image", "imageUrl", "thumbnail") || text(product, "image", "imageUrl", "thumbnail")),
          shopName: text(row, "shopName", "sellerName") || text(shop, "shopName", "sellerName", "name"),
          shopExternalId: text(row, "sellerId", "shopId") || text(shop, "sellerId", "shopId", "id"),
          region: text(row, "region", "country") || region, currency: text(row, "currency") || text(product, "currency"),
          price: number(row, "price", "salePrice") ?? number(product, "price", "salePrice"),
          originalPrice: number(row, "originalPrice", "listPrice") ?? number(product, "originalPrice", "listPrice"),
          soldCount: Math.round(number(row, "soldCount", "sales", "unitsSold") ?? number(product, "soldCount", "sales", "unitsSold") ?? 0),
          rating: number(row, "rating", "ratingScore") ?? number(product, "rating", "ratingScore"),
          reviewCount: Math.round(number(row, "reviewCount", "reviews") ?? number(product, "reviewCount", "reviews") ?? 0),
          category: text(row, "category", "categoryName") || text(product, "category", "categoryName"), raw: row as Prisma.InputJsonValue
        },
        update: {
          title, productUrl: safeUrl(text(row, "productUrl", "url") || text(product, "productUrl", "url")),
          imageUrl: safeUrl(text(row, "image", "imageUrl", "thumbnail") || text(product, "image", "imageUrl", "thumbnail")),
          shopName: text(row, "shopName", "sellerName") || text(shop, "shopName", "sellerName", "name"),
          price: number(row, "price", "salePrice") ?? number(product, "price", "salePrice"),
          soldCount: Math.round(number(row, "soldCount", "sales", "unitsSold") ?? number(product, "soldCount", "sales", "unitsSold") ?? 0),
          rating: number(row, "rating", "ratingScore") ?? number(product, "rating", "ratingScore"), lastSeenAt: new Date(), raw: row as Prisma.InputJsonValue
        }
      });
      imported += 1;
    } catch { failed += 1; }
  }
  return { imported, failed };
}
