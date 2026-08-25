"use client";

import { LinkButton } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { homeFaq, homeStructuredData, serializeJsonLd } from "@/lib/seo";
import { useT } from "@/lib/i18n";

export default function LandingPage() {
  const t = useT();

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#ddd6fe,transparent_35%),#f8fafc]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homeStructuredData) }}
      />
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <BrandLogo />
        <div className="flex gap-3">
          <LinkButton href="/login" className="bg-white text-slate-900 hover:bg-slate-100">{t("nav.login")}</LinkButton>
          <LinkButton href="/pricing">{t("nav.pricing")}</LinkButton>
        </div>
      </nav>
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-violet-200 bg-white/70 px-4 py-2 text-sm font-semibold text-violet-800">
            {t("landing.hero.badge")}
          </div>
          <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight text-slate-950 md:text-7xl">
            {t("landing.hero.title")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            {t("landing.hero.description")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/register" className="px-6 py-3">{t("landing.hero.cta.primary")}</LinkButton>
            <LinkButton href="/dashboard/ads" className="bg-slate-950 px-6 py-3 hover:bg-slate-800">{t("landing.hero.cta.secondary")}</LinkButton>
          </div>
        </div>
        <div className="glass rounded-[2rem] p-4 shadow-2xl">
          <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">Live winners</span>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs text-emerald-300">{t("trends.rising")}</span>
            </div>
            {["Smart Dog Collar", "LED Face Sculptor", "Greens Energy Blend"].map((item, i) => (
              <div key={item} className="mb-3 rounded-2xl bg-white/10 p-4">
                <div className="font-bold">{item}</div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-violet-400" style={{ width: `${85 - i * 12}%` }} />
                </div>
                <div className="mt-2 text-xs text-slate-400">Top %{4 + i * 6} · {27 + i * 9} {t("trends.days")}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-16" aria-labelledby="features-heading">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-700">{t("landing.features.subtitle")}</p>
          <h2 id="features-heading" className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            {t("landing.features.title")}
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            {t("landing.features.description")}
          </p>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            [t("feature.meta.title"), t("feature.meta.description")],
            [t("feature.tiktok.title"), t("feature.tiktok.description")],
            [t("feature.ai.title"), t("feature.ai.description")],
            [t("feature.trends.title"), t("feature.trends.description")],
            [t("feature.brand.title"), t("feature.brand.description")],
            [t("feature.store.title"), t("feature.store.description")]
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
          <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-700">{t("faq.subtitle")}</p>
          <h2 id="faq-heading" className="mt-3 text-3xl font-black tracking-tight text-slate-950">{t("faq.title")}</h2>
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
          <a href="/pricing" className="hover:text-slate-950">{t("footer.pricing")}</a>
          <a href="/register" className="hover:text-slate-950">{t("footer.startFree")}</a>
          <a href="/login" className="hover:text-slate-950">{t("footer.signIn")}</a>
        </div>
      </footer>
    </main>
  );
}
