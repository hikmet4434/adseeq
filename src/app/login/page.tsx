"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@winninghunter.local");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
    if (!res.ok) {
      setError("Giriş başarısız. Demo: demo@winninghunter.local / demo1234");
      return;
    }
    location.href = "/dashboard/ads";
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-black">Giriş yap</h1>
        <p className="mt-2 text-sm text-slate-500">Demo hesap hazır gelir.</p>
        <label className="mt-6 block text-sm font-bold">E-posta</label>
        <input className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="mt-4 block text-sm font-bold">Şifre</label>
        <input type="password" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <button className="mt-6 w-full rounded-xl bg-violet-700 px-4 py-3 font-bold text-white">Giriş</button>
        <a href="/register" className="mt-4 block text-center text-sm font-semibold text-violet-700">Hesap oluştur</a>
      </form>
    </main>
  );
}
