import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LEGACY_HOSTS = new Set(["kazananavci.seymata.com", "www.kazananavci.seymata.com"]);

export function proxy(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = (forwardedHost || request.headers.get("host") || "").split(":")[0].toLowerCase();

  if (!LEGACY_HOSTS.has(host) && host !== "www.adseeq.com") {
    return NextResponse.next();
  }

  const destination = new URL("https://adseeq.com");
  destination.pathname = request.nextUrl.pathname;
  destination.search = request.nextUrl.search;
  return NextResponse.redirect(destination, 301);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
