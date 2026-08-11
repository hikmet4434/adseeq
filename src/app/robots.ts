import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/llms.txt"],
      disallow: ["/api/", "/dashboard/", "/login", "/register"]
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL
  };
}
