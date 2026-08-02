/**
 * Hız sınırı — IP başına sabit pencere sayacı.
 *
 * Neden: yayına giren her uç saatler içinde otomatik botlarca taranıyor.
 * Sınırsız giriş ucu şifre kaba kuvvetine, sınırsız kayıt ucu sahte hesap
 * seline (her hesap ücretsiz plan kotası = maliyet) açık.
 *
 * Depo süreç belleğinde: ek altyapı (Redis) gerektirmez, tek konteyner
 * kurulumunda yeterlidir. Uygulama birden fazla instance'a çıkarılırsa
 * sayaç paylaşılmaz — o noktada Redis'e ya da Postgres tablosuna taşınmalı.
 */

type Kova = { sayac: number; bitis: number };

const kovalar = new Map<string, Kova>();

export const KURALLAR = {
  giris: { limit: 10, sureMs: 15 * 60 * 1000 },
  kayit: { limit: 5, sureMs: 60 * 60 * 1000 },
  arama: { limit: 60, sureMs: 60 * 1000 },
} as const;

export type KuralAdi = keyof typeof KURALLAR;

/**
 * Gerçek istemci IP'si. Coolify/Traefik arkasında x-forwarded-for gelir;
 * ilk eleman istemci tarafından uydurulabildiği için SON eleman (bizim
 * proxy'mizin eklediği) tercih edilir.
 */
export function istemciIp(req: Request): string {
  const gercek = req.headers.get("x-real-ip");
  if (gercek) return gercek.trim();
  const iletilen = req.headers.get("x-forwarded-for");
  if (iletilen) {
    const parcalar = iletilen.split(",").map((p) => p.trim()).filter(Boolean);
    if (parcalar.length) return parcalar[parcalar.length - 1]!;
  }
  return "bilinmiyor";
}

/**
 * Limit aşıldıysa hazır 429 yanıtı döndürür; aşılmadıysa null.
 *
 *   const sinir = hizSiniriAsimi(req, "giris");
 *   if (sinir) return sinir;
 *
 * `ekAnahtar` verilirse sayaç IP + o anahtar bazında tutulur (ör. e-posta):
 * tek IP'den farklı hesaplara saldırıyı da yavaşlatır.
 */
export function hizSiniriAsimi(
  req: Request,
  kuralAdi: KuralAdi,
  ekAnahtar?: string,
): Response | null {
  const kural = KURALLAR[kuralAdi];
  const simdi = Date.now();
  const anahtar = `${kuralAdi}|${istemciIp(req)}|${ekAnahtar ?? ""}`;

  let kova = kovalar.get(anahtar);
  if (!kova || simdi > kova.bitis) {
    kova = { sayac: 0, bitis: simdi + kural.sureMs };
    kovalar.set(anahtar, kova);
  }
  kova.sayac += 1;

  if (kova.sayac > kural.limit) {
    const kalanSn = Math.max(1, Math.ceil((kova.bitis - simdi) / 1000));
    const sure = kalanSn > 90 ? `${Math.ceil(kalanSn / 60)} dakika` : `${kalanSn} saniye`;
    return NextResponseBenzeri(
      { error: "RATE_LIMITED", message: `Çok fazla deneme yaptınız. ${sure} sonra tekrar deneyin.` },
      429,
      { "Retry-After": String(kalanSn) },
    );
  }

  return null;
}

function NextResponseBenzeri(
  govde: unknown,
  durum: number,
  basliklar: Record<string, string>,
) {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { "Content-Type": "application/json", ...basliklar },
  });
}

// Bellek şişmesini önle: süresi geçmiş kovaları periyodik temizle.
if (typeof setInterval !== "undefined") {
  const zamanlayici = setInterval(() => {
    const simdi = Date.now();
    for (const [k, v] of kovalar) if (simdi > v.bitis) kovalar.delete(k);
  }, 5 * 60 * 1000);
  zamanlayici.unref?.();
}
