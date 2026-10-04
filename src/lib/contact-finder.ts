// Reklamı durmuş bir markanın web sitesinden iletişim bilgilerini bulur:
// 1) Ana sayfa + "İletişim / Hakkımızda" sayfaları doğrudan taranır (ücretsiz).
// 2) Hiç e-posta çıkmazsa ve APIFY_TOKEN varsa Apify'ın iletişim tarayıcısı denenir.

import { ExtractedContacts, extractContacts, fetchPublicPage } from "@/lib/web-page";

const DEFAULT_CONTACT_ACTOR = "vdrmota~contact-info-scraper";

export type FoundContacts = { website: string; emails: string[]; phones: string[]; socials: string[]; source: "site" | "apify" | "none" };

export function websiteToUrl(website: string) {
  const trimmed = website.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function merge(target: ExtractedContacts, extra: ExtractedContacts) {
  for (const key of ["emails", "phones", "socials", "contactPages"] as const) {
    target[key] = [...new Set([...target[key], ...extra[key]])];
  }
}

async function scanSite(website: string) {
  const home = await fetchPublicPage(websiteToUrl(website));
  const contacts = extractContacts(`${home.text}\n${home.html}`, home.links, home.url);
  for (const pageUrl of contacts.contactPages.slice(0, 2)) {
    try {
      const page = await fetchPublicPage(pageUrl);
      merge(contacts, extractContacts(`${page.text}\n${page.html}`, page.links, home.url));
    } catch { /* iletişim sayfası açılmazsa ana sayfa sonuçlarıyla devam edilir */ }
  }
  return contacts;
}

type ApifyContactItem = { emails?: string[]; phones?: string[]; linkedIns?: string[]; instagrams?: string[]; facebooks?: string[]; tiktoks?: string[]; youtubes?: string[]; twitters?: string[] };

async function scanWithApify(website: string, token: string) {
  const actorId = (process.env.APIFY_CONTACT_ACTOR_ID?.trim() || DEFAULT_CONTACT_ACTOR).replace("/", "~");
  if (!/^[a-zA-Z0-9_-]+~[a-zA-Z0-9_-]+$/.test(actorId)) throw new Error("APIFY_ACTOR_INVALID");
  const query = new URLSearchParams({ clean: "true", timeout: "90", maxItems: "10", maxTotalChargeUsd: "0.2" });
  const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?${query}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ startUrls: [{ url: websiteToUrl(website) }], maxDepth: 1, maxRequestsPerStartUrl: 6, sameDomain: true }),
    cache: "no-store",
    signal: AbortSignal.timeout(110_000)
  });
  if (!response.ok) throw new Error(`APIFY_HTTP_${response.status}`);
  const items = await response.json() as ApifyContactItem[];
  const list = Array.isArray(items) ? items : [];
  const all = (key: keyof ApifyContactItem) => [...new Set(list.flatMap((item) => Array.isArray(item[key]) ? item[key]! : []))];
  const text = all("emails").join(" ");
  const contacts = extractContacts(text, [], websiteToUrl(website));
  return {
    emails: contacts.emails,
    phones: all("phones").slice(0, 5),
    socials: [...all("instagrams"), ...all("facebooks"), ...all("linkedIns"), ...all("tiktoks"), ...all("youtubes"), ...all("twitters")].slice(0, 8)
  };
}

export async function findContacts(website: string): Promise<FoundContacts> {
  let site: ExtractedContacts = { emails: [], phones: [], socials: [], contactPages: [] };
  try { site = await scanSite(website); } catch { /* site açılmadı; Apify denenebilir */ }
  if (site.emails.length) return { website, emails: site.emails, phones: site.phones, socials: site.socials, source: "site" };

  const token = process.env.APIFY_TOKEN?.trim();
  if (token) {
    try {
      const apify = await scanWithApify(website, token);
      if (apify.emails.length || apify.phones.length) {
        return {
          website,
          emails: apify.emails,
          phones: [...new Set([...site.phones, ...apify.phones])].slice(0, 5),
          socials: [...new Set([...site.socials, ...apify.socials])].slice(0, 8),
          source: "apify"
        };
      }
    } catch { /* Apify başarısızsa site sonuçları döner */ }
  }
  return { website, emails: [], phones: site.phones, socials: site.socials, source: site.phones.length || site.socials.length ? "site" : "none" };
}
