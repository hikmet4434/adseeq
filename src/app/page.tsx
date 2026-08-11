import { LinkButton } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { homeFaq, homeStructuredData, serializeJsonLd } from "@/lib/seo";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#ddd6fe,transparent_35%),#f8fafc]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeStructuredData) }}
      />
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <BrandLogo />
        <div className="flex gap-3">
          <LinkButton href="/login" className="bg-white text-slate-900 hover:bg-slate-100">Giriş</LinkButton>
          <LinkButton href="/pricing">Planlar</LinkButton>
        </div>
      </nav>
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-violet-200 bg-white/70 px-4 py-2 text-sm font-semibold text-violet-800">
            Meta Ads + TikTok Shop + AI Trend Intelligence
          </div>
          <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight text-slate-950 md:text-7xl">
            Kazanan reklamları ve mağazaları dakikalar içinde keşfet.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            AdSeeQ, reklam ve e-ticaret araştırmalarını tek panelde birleştiren reklam zekâsı platformudur. Meta Ads Library reklamlarını araştırın, TikTok Shop ürünlerini keşfedin, Magic AI ile trend sinyallerini analiz edin ve rakip markaları takip edin.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/register" className="px-6 py-3">Ücretsiz başla</LinkButton>
            <LinkButton href="/dashboard/ads" className="bg-slate-950 px-6 py-3 hover:bg-slate-800">Panele git</LinkButton>
          </div>
        </div>
        <div className="glass rounded-[2rem] p-4 shadow-2xl">
          <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">Live winners</span>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-300">Rising</span>
            </div>
            {["Smart Dog Collar", "LED Face Sculptor", "Greens Energy Blend"].map((item, i) => (
              <div key={item} className="mb-3 rounded-2xl bg-white/10 p-4">
                <div className="font-bold">{item}</div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-violet-400" style={{ width: `${85 - i * 12}%` }} />
                </div>
                <div className="mt-2 text-xs text-slate-400">Top %{4 + i * 6} · {27 + i * 9} days running</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16" aria-labelledby="features-heading">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-700">Tek panel, altı araştırma aracı</p>
          <h2 id="features-heading" className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            Reklamdan trende, araştırma akışınız tek yerde
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            Kreatifleri bulun, sinyalleri karşılaştırın ve incelemek istediğiniz reklam, mağaza ve markaları kaydedin.
          </p>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            ["Meta reklam araştırması", "Anahtar kelime ve ülkeye göre medya içeren reklam kreatiflerini araştırın."],
            ["TikTok Shop keşfi", "Ürünleri ve mağaza sinyallerini aynı araştırma akışında inceleyin."],
            ["Magic AI", "Kreatif açıları, hedef kitle fikirleri ve test edilebilir yaklaşımlar üretin."],
            ["Trends", "Yükselen reklam ve ürün sinyallerini düzenli bir görünümde takip edin."],
            ["Brand Tracker", "Rakip markaları kaydedin ve yeni hareketlerini tek listeden izleyin."],
            ["Store Tracker", "Mağazaları takip edin, benzer mağazaları ve ürün sinyallerini keşfedin."]
          ].map(([title, description]) => (
            <article key={title} className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">{title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="border-y border-slate-200 bg-white/70" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-700">Sık sorulan sorular</p>
          <h2 id="faq-heading" className="mt-3 text-3xl font-black tracking-tight text-slate-950">AdSeeQ hakkında</h2>
          <div className="mt-8 space-y-4">
            {homeFaq.map(({ question, answer }) => (
              <details key={question} className="group rounded-2xl border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer list-none pr-6 font-black text-slate-950">{question}</summary>
                <p className="mt-3 leading-7 text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <BrandLogo markClassName="h-8 w-8" />
        <div className="flex gap-5">
          <a href="/pricing" className="hover:text-slate-950">Fiyatlandırma</a>
          <a href="/register" className="hover:text-slate-950">Ücretsiz başla</a>
          <a href="/login" className="hover:text-slate-950">Giriş</a>
        </div>
      </footer>
    </main>
  );
}
