import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "weekly",
      priority: 1,
      alternates: { languages: { "tr-TR": SITE_URL } }
    },
    {
      url: `${SITE_URL}/pricing`,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages: { "tr-TR": `${SITE_URL}/pricing` } }
    }
  ];
}
