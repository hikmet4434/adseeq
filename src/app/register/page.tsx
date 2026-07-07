"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password, name }) });
    if (!res.ok) {
      setError("Kayıt başarısız. E-posta kullanılıyor olabilir veya seed çalışmamış olabilir.");
      return;
    }
    location.href = "/dashboard/ads";
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-black">Ücretsiz başla</h1>
        <label className="mt-6 block text-sm font-bold">Ad</label>
        <input className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="mt-4 block text-sm font-bold">E-posta</label>
        <input className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="mt-4 block text-sm font-bold">Şifre</label>
        <input type="password" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <button className="mt-6 w-full rounded-xl bg-violet-700 px-4 py-3 font-bold text-white">Hesap oluştur</button>
      </form>
    </main>
  );
}
