import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  return parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0;
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb");
}

export function isSafeMediaHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!normalized || normalized === "localhost" || normalized.endsWith(".localhost") || normalized.endsWith(".local") || normalized.endsWith(".internal")) return false;
  const version = isIP(normalized);
  if (version === 4) return !isPrivateIpv4(normalized);
  if (version === 6) return !isPrivateIpv6(normalized);
  return true;
}

async function assertPublicTarget(url: URL) {
  if (url.protocol !== "https:" || !isSafeMediaHostname(url.hostname)) throw new Error("UNSAFE_MEDIA_URL");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address, family }) => family === 4 ? isPrivateIpv4(address) : isPrivateIpv6(address))) {
    throw new Error("UNSAFE_MEDIA_URL");
  }
}

export async function fetchMedia(urlValue: string, range: string | null) {
  let url = new URL(urlValue);
  for (let redirect = 0; redirect < 4; redirect += 1) {
    await assertPublicTarget(url);
    const response = await fetch(url, {
      headers: {
        ...(range ? { range } : {}),
        accept: "video/*,*/*;q=0.8",
        referer: "https://www.facebook.com/",
        "user-agent": "Mozilla/5.0 (compatible; AdSeeQMedia/1.0)"
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(30_000)
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    if (!location) return response;
    url = new URL(location, url);
  }
  throw new Error("TOO_MANY_REDIRECTS");
}
