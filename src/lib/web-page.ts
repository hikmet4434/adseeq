// Herkese açık bir web sayfasını güvenli şekilde çeker (iç ağ adreslerine istek
// atılmaz) ve sayfadan iletişim bilgisi ile hedef sayfa (landing page) sinyallerini çıkarır.
// FIRECRAWL_API_KEY tanımlıysa JavaScript ile çizilen sayfalar için Firecrawl kullanılır.

import { assertPublicTarget } from "@/lib/media-proxy";
import { detectOffers } from "@/lib/conversion-finder";

const MAX_HTML_BYTES = 1_500_000;

export type FetchedPage = { url: string; html: string; text: string; links: string[]; title: string | null; description: string | null; via: "direct" | "firecrawl" };

export function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

export function htmlToText(html: string) {
  return decodeEntities(html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|section|article|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export function extractLinks(html: string, baseUrl: string) {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"'#]+)["']/gi)) {
    const href = decodeEntities(match[1]!.trim());
    if (/^(mailto|tel|whatsapp):/i.test(href)) { links.add(href); continue; }
    try { links.add(new URL(href, baseUrl).toString()); } catch { /* geçersiz bağlantı */ }
  }
  return [...links];
}

function tagText(html: string, tag: string, limit: number) {
  const values: string[] = [];
  for (const match of html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))) {
    const text = htmlToText(match[1]!).replace(/\s+/g, " ").trim();
    if (text && !values.includes(text)) values.push(text.slice(0, 160));
    if (values.length >= limit) break;
  }
  return values;
}

function metaContent(html: string, name: string) {
  const pattern = new RegExp(`<meta[^>]+(?:name|property)\\s*=\\s*["']${name}["'][^>]*>`, "i");
  const tag = html.match(pattern)?.[0];
  const content = tag?.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content).trim() || null : null;
}

async function fetchDirect(urlValue: string): Promise<FetchedPage> {
  let url = new URL(urlValue);
  for (let redirect = 0; redirect < 5; redirect += 1) {
    await assertPublicTarget(url, true);
    const response = await fetch(url, {
      headers: { accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "accept-language": "tr-TR,tr;q=0.9,en;q=0.8", "user-agent": "Mozilla/5.0 (compatible; AdSeeQBot/1.0; +https://adseeq.com)" },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000)
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("PAGE_REDIRECT_INVALID");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error(`PAGE_HTTP_${response.status}`);
    const type = response.headers.get("content-type") || "";
    if (type && !/html|xml|text\/plain/i.test(type)) throw new Error("PAGE_NOT_HTML");
    const buffer = await response.arrayBuffer();
    const html = new TextDecoder("utf-8").decode(buffer.byteLength > MAX_HTML_BYTES ? buffer.slice(0, MAX_HTML_BYTES) : buffer);
    return {
      url: url.toString(), html, text: htmlToText(html), links: extractLinks(html, url.toString()),
      title: tagText(html, "title", 1)[0] || metaContent(html, "og:title"),
      description: metaContent(html, "description") || metaContent(html, "og:description"),
      via: "direct"
    };
  }
  throw new Error("PAGE_TOO_MANY_REDIRECTS");
}

async function fetchFirecrawl(urlValue: string, apiKey: string): Promise<FetchedPage> {
  await assertPublicTarget(new URL(urlValue), true);
  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ url: urlValue, formats: ["markdown", "html", "links"], onlyMainContent: false, timeout: 30_000 }),
    cache: "no-store",
    signal: AbortSignal.timeout(45_000)
  });
  if (!response.ok) throw new Error(`FIRECRAWL_HTTP_${response.status}`);
  const payload = await response.json() as { data?: { markdown?: string; html?: string; links?: string[]; metadata?: { title?: string; description?: string; sourceURL?: string; url?: string } } };
  const data = payload.data;
  if (!data) throw new Error("FIRECRAWL_INVALID_RESPONSE");
  const html = (data.html || "").slice(0, MAX_HTML_BYTES);
  const finalUrl = data.metadata?.url || data.metadata?.sourceURL || urlValue;
  return {
    url: finalUrl, html, text: data.markdown || htmlToText(html),
    links: [...new Set([...(data.links || []), ...extractLinks(html, finalUrl)])],
    title: data.metadata?.title || tagText(html, "title", 1)[0] || null,
    description: data.metadata?.description || metaContent(html, "description"),
    via: "firecrawl"
  };
}

// Meta reklam bağlantıları çoğu zaman l.facebook.com/l.php?u=... ile sarılır; asıl adres çıkarılır.
export function unwrapRedirectUrl(value: string) {
  try {
    const url = new URL(value);
    if (/(^|\.)facebook\.com$/i.test(url.hostname) && url.pathname.startsWith("/l.php")) return url.searchParams.get("u") || value;
    return value;
  } catch { return value; }
}

// Önce doğrudan çekilir; sayfa boş gelirse (JavaScript ile çizilen siteler) ya da
// engellenirse ve Firecrawl anahtarı varsa Firecrawl denenir.
export async function fetchPublicPage(rawUrl: string): Promise<FetchedPage> {
  const urlValue = unwrapRedirectUrl(rawUrl);
  const firecrawlKey = process.env.FIRECRAWL_API_KEY?.trim();
  try {
    const page = await fetchDirect(urlValue);
    if (firecrawlKey && page.text.length < 200) return await fetchFirecrawl(urlValue, firecrawlKey).catch(() => page);
    return page;
  } catch (error) {
    if (error instanceof Error && error.message === "UNSAFE_MEDIA_URL") throw new Error("UNSAFE_URL");
    if (firecrawlKey) return fetchFirecrawl(urlValue, firecrawlKey);
    throw error;
  }
}

// ─── İletişim bilgisi çıkarma ───

const EMAIL_PATTERN = /[a-z0-9][a-z0-9._%+-]{0,63}@[a-z0-9.-]+\.[a-z]{2,24}/gi;
const JUNK_EMAIL = /(example\.(com|org)|domain\.com|email\.com|sentry|wixpress|\.(png|jpe?g|gif|webp|svg|css|js)$|@\d+x\.|u003e|noreply|no-reply|donotreply)/i;
const SOCIAL_HOSTS = /(^|\.)(instagram\.com|facebook\.com|linkedin\.com|tiktok\.com|youtube\.com|x\.com|twitter\.com|wa\.me|api\.whatsapp\.com)$/i;

export type ExtractedContacts = { emails: string[]; phones: string[]; socials: string[]; contactPages: string[] };

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  const count = digits.replace(/\D/g, "").length;
  return count >= 10 && count <= 15 ? digits : null;
}

export function extractContacts(text: string, links: string[], siteUrl: string): ExtractedContacts {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const socials = new Set<string>();
  const contactPages = new Set<string>();
  let siteHost = "";
  try { siteHost = new URL(siteUrl).hostname.replace(/^www\./, ""); } catch { /* yok */ }

  const addEmail = (value: string) => {
    const email = decodeURIComponent(value).trim().toLowerCase().replace(/^mailto:/, "").split("?")[0]!;
    if (/^[^@\s]+@[^@\s]+\.[a-z]{2,24}$/.test(email) && !JUNK_EMAIL.test(email)) emails.add(email);
  };

  for (const match of decodeEntities(text).matchAll(EMAIL_PATTERN)) addEmail(match[0]);
  for (const link of links) {
    if (/^mailto:/i.test(link)) { try { addEmail(link); } catch { /* bozuk */ } continue; }
    if (/^tel:/i.test(link)) { const phone = normalizePhone(link.slice(4)); if (phone) phones.add(phone); continue; }
    try {
      const url = new URL(link);
      const host = url.hostname.replace(/^www\./, "");
      if (SOCIAL_HOSTS.test(host) && url.pathname.length > 1 && !/\/(sharer|share|intent|plugins|dialog)/i.test(url.pathname)) socials.add(`${url.origin}${url.pathname}`.replace(/\/$/, ""));
      if (host === siteHost && /(iletisim|contact|bize-ulasin|bize-ulas|kontakt|hakkimizda|about|impressum)/i.test(url.pathname)) contactPages.add(url.toString());
    } catch { /* geçersiz */ }
  }
  // Metinde açıkça yazılmış Türkiye telefon numaraları (0 5xx / +90 ...).
  for (const match of text.matchAll(/(?:\+90|0)\s?\(?[2-5]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g)) {
    const phone = normalizePhone(match[0]);
    if (phone) phones.add(phone);
  }

  // Sitenin kendi alan adındaki adresler öne alınır.
  const sortedEmails = [...emails].sort((left, right) => Number(right.endsWith(`@${siteHost}`)) - Number(left.endsWith(`@${siteHost}`)));
  return { emails: sortedEmails.slice(0, 8), phones: [...phones].slice(0, 5), socials: [...socials].slice(0, 8), contactPages: [...contactPages].slice(0, 3) };
}

// ─── Hedef sayfa (landing page) analizi ───

export type LandingPageSummary = {
  url: string;
  title: string | null;
  description: string | null;
  headings: string[];
  ctas: string[];
  prices: string[];
  offers: string[];
  trustSignals: string[];
  excerpt: string;
  via: "direct" | "firecrawl";
};

const TRUST_RULES: Array<[RegExp, string]> = [
  [/yorum|değerlendirme|review|★|⭐|puan/i, "Müşteri yorumları"],
  [/garanti|guarantee/i, "Garanti"],
  [/iade|return|refund/i, "İade politikası"],
  [/güvenli ödeme|secure checkout|ssl|3d secure/i, "Güvenli ödeme"],
  [/kargo|shipping|teslimat|delivery/i, "Kargo / teslimat bilgisi"],
  [/whatsapp|canlı destek|live chat/i, "Canlı destek / WhatsApp"],
  [/sertifika|certified|onaylı|tse|iso/i, "Sertifika"],
  [/sıkça sorulan|sss|faq/i, "SSS bölümü"]
];

export function summarizeLandingPage(page: FetchedPage): LandingPageSummary {
  const html = page.html;
  const headings = [...tagText(html, "h1", 3), ...tagText(html, "h2", 6)];
  const ctas = [...tagText(html, "button", 12)]
    .concat([...html.matchAll(/<a\b[^>]*class\s*=\s*["'][^"']*(btn|button|cta)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)].map((match) => htmlToText(match[2]!).trim()))
    .map((text) => text.replace(/\s+/g, " "))
    .filter((text) => text.length >= 2 && text.length <= 40);
  const text = page.text;
  const prices = [...new Set([...text.matchAll(/(?:₺|\$|€|£)\s?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?\s?(?:TL|₺|USD|EUR|€)/gi)].map((match) => match[0].replace(/\s+/g, " ").trim()))].slice(0, 8);
  return {
    url: page.url,
    title: page.title,
    description: page.description,
    headings: headings.length ? headings : text.split("\n").filter((line) => line.length > 15 && line.length < 120).slice(0, 4),
    ctas: [...new Set(ctas)].slice(0, 8),
    prices,
    offers: detectOffers(text),
    trustSignals: TRUST_RULES.filter(([pattern]) => pattern.test(text)).map(([, label]) => label),
    excerpt: text.replace(/\s+/g, " ").slice(0, 2500),
    via: page.via
  };
}
