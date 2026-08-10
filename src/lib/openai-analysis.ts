type AdSignal = { headline: string | null; primaryText: string | null; mediaType: string; daysRunning: number | null; status: string; brand: string | null };

export type CreativeAnalysis = { summary: string; insights: Array<{ title: string; action: string; confidence: number }> };

export async function analyzeCreatives(query: string | undefined, ads: AdSignal[]): Promise<CreativeAnalysis & { model: string }> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_NOT_CONFIGURED");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-5";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: [{ type: "input_text", text: "Sen bir reklam kreatif stratejistisin. Sadece verilen sinyallere dayan. Türkçe, kısa, somut A/B test önerileri üret. Veri yoksa uydurma." }] },
          { role: "user", content: [{ type: "input_text", text: JSON.stringify({ query: query || null, ads }) }] }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "creative_analysis",
            strict: true,
            schema: {
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
            }
          }
        },
        reasoning: { effort: "minimal" },
        max_output_tokens: 2400
      }),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`OPENAI_HTTP_${response.status}`);
    const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
    const outputText = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    if (!outputText) throw new Error("OPENAI_INVALID_RESPONSE");
    const parsed = JSON.parse(outputText) as CreativeAnalysis;
    if (!parsed.summary || !Array.isArray(parsed.insights)) throw new Error("OPENAI_INVALID_RESPONSE");
    return { ...parsed, model };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("OPENAI_TIMEOUT");
    throw error;
  } finally { clearTimeout(timer); }
}
