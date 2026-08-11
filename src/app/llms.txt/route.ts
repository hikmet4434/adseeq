import { SITE_DESCRIPTION, SITE_URL } from "@/lib/seo";

const content = `# AdSeeQ

> ${SITE_DESCRIPTION}

AdSeeQ, reklam araştırması ve e-ticaret trend keşfi yapan ekipler için web tabanlı bir platformdur.

## Temel özellikler

- Meta Ads Library reklamlarını anahtar kelime ve ülkeye göre araştırma
- Medya içeren reklam kreatiflerini inceleme ve kaydetme
- TikTok Shop ürün keşfi
- Magic AI ile reklam ve ürün sinyallerini analiz etme
- Trends ile yükselen sinyalleri takip etme
- Brand Tracker ve Store Tracker ile marka ve mağaza takibi

## Resmî sayfalar

- Ana sayfa: ${SITE_URL}
- Fiyatlandırma: ${SITE_URL}/pricing
- Hesap oluşturma: ${SITE_URL}/register
- Giriş: ${SITE_URL}/login

## Ürün bilgisi

AdSeeQ ücretsiz ve ücretli planlar sunar. Güncel plan limitleri ve fiyatlar için resmî fiyatlandırma sayfasını kullanın. Özel dashboard ve API rotaları herkese açık içerik değildir.
`;

export function GET() {
  return new Response(content, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400"
    }
  });
}
