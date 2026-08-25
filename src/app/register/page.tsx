"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useT } from "@/lib/i18n";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function RegisterPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, name }) });
    if (!res.ok) {
      setError(t("auth.registerError"));
      return;
    }
    location.href = "/dashboard/ads";
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <a href="/" className="mb-7 inline-flex"><BrandLogo /></a>
        <h1 className="text-3xl font-black">{t("landing.hero.cta.primary")}</h1>

        <label className="mt-6 block text-sm font-bold">{t("auth.name")}</label>
        <input
          placeholder={t("auth.namePlaceholder")}
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-600"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label className="mt-4 block text-sm font-bold">{t("auth.email")}</label>
        <input
          type="email"
          placeholder={t("auth.emailPlaceholder")}
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-600"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="mt-4 block text-sm font-bold">{t("auth.password")}</label>
        <input
          type="password"
          placeholder={t("auth.passwordPlaceholderLong")}
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-600"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <a href="/api/auth/google/start" className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">
          <GoogleIcon />
          {t("auth.googleContinue")}
        </a>

        <div className="mt-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">{t("auth.or")}</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button className="mt-4 w-full rounded-xl bg-violet-700 px-4 py-3 font-bold text-white hover:bg-violet-800 transition">
          {t("auth.createAccount")}
        </button>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">{t("auth.haveAccount")} </span>
          <a href="/login" className="font-semibold text-violet-700 hover:underline">
            {t("auth.login.title")}
          </a>
        </div>
      </form>
    </main>
  );
}
