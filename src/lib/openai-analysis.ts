type AdSignal = { headline: string | null; primaryText: string | null; mediaType: string; daysRunning: number | null; status: string; brand: string | null };

export type CreativeAnalysis = { summary: string; insights: Array<{ title: string; action: string; confidence: number }> };

type JsonSchema = Record<string, unknown>;

async function openAiJson<T>(system: string, payload: unknown, name: string, schema: JsonSchema, maxOutputTokens: number): Promise<{ data: T; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: [{ type: "input_text", text: system }] },
          { role: "user", content: [{ type: "input_text", text: JSON.stringify(payload) }] }
        ],
        text: { format: { type: "json_schema", name, strict: true, schema } },
        reasoning: { effort: "minimal" },
        max_output_tokens: maxOutputTokens
      }),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`OPENAI_HTTP_${response.status}`);
    const body = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const outputText = body.output_text || body.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    if (!outputText) throw new Error("OPENAI_INVALID_RESPONSE");
    return { data: JSON.parse(outputText) as T, model };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("OPENAI_TIMEOUT");
    if (error instanceof SyntaxError) throw new Error("OPENAI_INVALID_RESPONSE");
    throw error;
  } finally { clearTimeout(timer); }
}

const insightsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    insights: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          action: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        required: ["title", "action", "confidence"]
      }
    }
  },
  required: ["summary", "insights"]
};

export async function analyzeCreatives(query: string | undefined, ads: AdSignal[]): Promise<CreativeAnalysis & { model: string }> {
  const { data, model } = await openAiJson<CreativeAnalysis>(
    "Sen bir reklam kreatif stratejistisin. Sadece verilen sinyallere dayan. Türkçe, kısa, somut A/B test önerileri üret. Veri yoksa uydurma.",
    { query: query || null, ads }, "creative_analysis", insightsSchema, 2400
  );
  if (!data.summary || !Array.isArray(data.insights)) throw new Error("OPENAI_INVALID_RESPONSE");
  return { ...data, model };
}

export type WinningAdInput = {
  brand: string | null;
  headline: string | null;
  primaryText: string | null;
  description: string | null;
  ctaText: string | null;
  landingUrl: string | null;
  mediaType: string;
  daysRunning: number | null;
  status: string;
  variantCount: number;
  platforms: string[];
  countries: string[];
  winnerScore: number;
  targetMarket: string | null;
};

export type WinningAdAnalysis = {
  verdict: string;
  whyItWins: string[];
  hook: string;
  offer: string;
  audience: string;
  variations: Array<{ title: string; hook: string; headline: string; primaryText: string; visualIdea: string; market: string }>;
  testPlan: string[];
};

const winningAdSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string" },
    whyItWins: { type: "array", minItems: 2, maxItems: 6, items: { type: "string" } },
    hook: { type: "string" },
    offer: { type: "string" },
    audience: { type: "string" },
    variations: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          hook: { type: "string" },
          headline: { type: "string" },
          primaryText: { type: "string" },
          visualIdea: { type: "string" },
          market: { type: "string" }
        },
        required: ["title", "hook", "headline", "primaryText", "visualIdea", "market"]
      }
    },
    testPlan: { type: "array", minItems: 2, maxItems: 5, items: { type: "string" } }
  },
  required: ["verdict", "whyItWins", "hook", "offer", "audience", "variations", "testPlan"]
};

export async function analyzeWinningAd(ad: WinningAdInput): Promise<WinningAdAnalysis & { model: string }> {
  const { data, model } = await openAiJson<WinningAdAnalysis>(
    "Sen performans reklamcılığı uzmanısın. Sana Meta reklam kütüphanesinden bir reklam ve herkese açık sinyalleri (yayın süresi, aktiflik, varyasyon sayısı, platformlar) veriliyor. Uzun süre yayında kalan ve çok varyasyonu olan reklam para kazandırıyor demektir. Görevin: 1) reklamın neden tuttuğunu (ya da tutmadığını) metin, kanca (hook), teklif, CTA ve hedef kitle açısından açıklamak, 2) aynı kazanan kalıbı koruyarak sıfırdan değil, bu reklamın 3-5 varyasyonunu yazmak (farklı kanca, farklı kitle, gerekirse farklı pazar/kültüre uyarlanmış görsel fikri), 3) kısa bir A/B test planı vermek. Türkçe yaz. Verilmeyen veriyi uydurma; satış rakamı tahmin etme. Varyasyon metinleri doğrudan kullanılabilir reklam metni olsun. targetMarket verilmişse varyasyonları o pazara uyarla.",
    ad, "winning_ad_analysis", winningAdSchema, 3200
  );
  if (!Array.isArray(data.variations) || !Array.isArray(data.whyItWins)) throw new Error("OPENAI_INVALID_RESPONSE");
  return { ...data, model };
}

export type AccountAnalysisInput = {
  ads: Array<{ name: string; campaign: string | null; spend: number; ctr: number; conversions: number; cpa: number | null; roas: number | null; verdict: string }>;
  competitorWinners: Array<{ brand: string | null; headline: string | null; primaryText: string | null; daysRunning: number | null; variantCount: number }>;
};

export async function analyzeAccountAds(input: AccountAnalysisInput): Promise<CreativeAnalysis & { model: string }> {
  const { data, model } = await openAiJson<CreativeAnalysis>(
    "Sen bir reklam hesabı denetçisisin. Kullanıcının kendi Meta reklamlarının performansı (harcama, CTR, dönüşüm, CPA, ROAS, sistemin verdiği karar) ve aynı nişte rakiplerin uzun süredir yayında olan kazanan reklamları veriliyor. Özet kısmında hangi reklamların tuttuğunu, hangilerinin bütçe yaktığını ve nedenini anlat. insights kısmında somut aksiyonlar ver: hangi reklam kapatılmalı, hangisine bütçe artırılmalı, rakiplerin kazanan kalıplarından hangisi test edilmeli ve hangi yeni içerik üretilmeli. Türkçe, kısa ve uygulanabilir yaz. Veri yoksa uydurma.",
    input, "account_analysis", insightsSchema, 2800
  );
  if (!data.summary || !Array.isArray(data.insights)) throw new Error("OPENAI_INVALID_RESPONSE");
  return { ...data, model };
}
