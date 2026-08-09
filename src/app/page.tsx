import { LinkButton } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#ddd6fe,transparent_35%),#f8fafc]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="text-xl font-black tracking-tight">WinningHunter<span className="text-violet-700">.AI</span></div>
        <div className="flex gap-3">
          <LinkButton href="/login" className="bg-white text-slate-900 hover:bg-slate-100">Giriş</LinkButton>
          <LinkButton href="/pricing">Planlar</LinkButton>
        </div>
      </nav>
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-violet-200 bg-white/70 px-4 py-2 text-sm font-semibold text-violet-800">
            Meta Ads + Shopify Store Intelligence MVP
          </div>
          <h1 className="max-w-4xl text-5xl font-black leading-tight tracking-tight text-slate-950 md:text-7xl">
            Kazanan reklamları ve mağazaları dakikalar içinde keşfet.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Dropshipping ve e-ticaret için reklam kütüphanesi, mağaza keşfi, kaydetme, takip ve kota tabanlı üyelik altyapısı tek panelde.
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
    </main>
  );
}
