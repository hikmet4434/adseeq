"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth/login", { 
      method: "POST", 
      headers: { "content-type": "application/json" }, 
      body: JSON.stringify({ email, password }) 
    });
    if (!res.ok) {
      setError("Giriş başarısız. Demo hesap için aşağıdaki butonu kullanabilir veya bilgileri elle girebilirsiniz (demo@winninghunter.local / demo1234).");
      return;
    }
    location.href = "/dashboard/ads";
  }

  async function loginAsDemo(e: React.MouseEvent) {
    e.preventDefault();
    setError("");
    const demoEmail = "demo@winninghunter.local";
    const demoPassword = "demo1234";
    const res = await fetch("/api/auth/login", { 
      method: "POST", 
      headers: { "content-type": "application/json" }, 
      body: JSON.stringify({ email: demoEmail, password: demoPassword }) 
    });
    if (!res.ok) {
      setError("Demo girişi başarısız. Demo veritabanı kurulmamış olabilir.");
      return;
    }
    location.href = "/dashboard/ads";
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-black">Giriş yap</h1>
        <p className="mt-2 text-sm text-slate-500">Kendi oluşturduğunuz hesapla veya hazır demo hesapla giriş yapabilirsiniz.</p>
        
        <label className="mt-6 block text-sm font-bold">E-posta</label>
        <input 
          type="email" 
          placeholder="E-posta adresiniz"
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-600" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required
        />
        
        <label className="mt-4 block text-sm font-bold">Şifre</label>
        <input 
          type="password" 
          placeholder="Şifreniz"
          className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-600" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required
        />
        
        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        
        <button type="submit" className="mt-6 w-full rounded-xl bg-violet-700 px-4 py-3 font-bold text-white hover:bg-violet-800 transition">
          Giriş yap
        </button>

        <button 
          type="button" 
          onClick={loginAsDemo}
          className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-100 transition"
        >
          Hazır Demo Hesapla Giriş Yap
        </button>
        
        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500">Hesabınız yok mu? </span>
          <a href="/register" className="font-semibold text-violet-700 hover:underline">
            Hesap oluştur
          </a>
        </div>
      </form>
    </main>
  );
}
