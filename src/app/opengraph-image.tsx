import { ImageResponse } from "next/og";

export const alt = "AdSeeQ — Reklam ve trend zekâsı";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #4c1d95 58%, #7c3aed 100%)",
        color: "white",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        padding: "72px",
        width: "100%"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "980px" }}>
        <div style={{ alignItems: "center", display: "flex", fontSize: 46, fontWeight: 800 }}>
          <span
            style={{
              alignItems: "center",
              background: "white",
              borderRadius: 24,
              color: "#6d28d9",
              display: "flex",
              height: 82,
              justifyContent: "center",
              marginRight: 24,
              width: 82
            }}
          >
            Q
          </span>
          AdSeeQ
        </div>
        <div style={{ fontSize: 72, fontWeight: 900, letterSpacing: "-3px", lineHeight: 1.06, marginTop: 48 }}>
          Kazanan reklamları ve trendleri keşfedin
        </div>
        <div style={{ color: "#ddd6fe", fontSize: 30, lineHeight: 1.35, marginTop: 30 }}>
          Meta Ads · TikTok Shop · Magic AI · Trends · Brand Tracker
        </div>
      </div>
    </div>,
    size
  );
}
