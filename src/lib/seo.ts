export const SITE_URL = "https://adseeq.com";

export const SITE_NAME = "AdSeeQ";

export const SITE_DESCRIPTION =
  "Meta reklamlarını, TikTok Shop ürünlerini, yükselen trendleri ve rakip markaları yapay zekâ destekli tek panelden araştırın.";

export const homeFaq = [
  {
    question: "AdSeeQ nedir?",
    answer:
      "AdSeeQ; Meta reklamlarını, TikTok Shop ürünlerini, yükselen trendleri ve rakip markaları tek panelde araştırmaya yardımcı olan reklam ve trend zekâsı platformudur."
  },
  {
    question: "AdSeeQ ile hangi reklamlar araştırılabilir?",
    answer:
      "Meta Ads Library kaynaklı reklamlar anahtar kelime ve ülke ölçütleriyle aranabilir; medya içeren kreatifler incelenebilir ve uygun reklamlar daha sonra değerlendirmek üzere kaydedilebilir."
  },
  {
    question: "Magic AI ne işe yarar?",
    answer:
      "Magic AI, reklam ve ürün sinyallerini özetleyerek kreatif açıları, hedef kitle fikirleri ve test edilebilecek pazarlama yaklaşımları üretmeye yardımcı olur."
  },
  {
    question: "AdSeeQ ücretsiz kullanılabilir mi?",
    answer:
      "Evet. Ücretsiz plan günlük sınırlı reklam araması sunar; daha yüksek arama ve takip limitleri için ücretli planlar bulunur."
  }
] as const;

export const homeStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "tr-TR",
      publisher: { "@id": `${SITE_URL}/#organization` }
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Advertising Intelligence",
      operatingSystem: "Web",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "tr-TR",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
        description: "Günlük sınırlı reklam araması içeren ücretsiz plan"
      },
      publisher: { "@id": `${SITE_URL}/#organization` }
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: homeFaq.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer
        }
      }))
    }
  ]
};

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
