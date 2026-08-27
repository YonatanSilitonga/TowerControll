"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Eye, EyeOff, Shield, ArrowRight, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const setSessionMode = useAuthStore((s) => s.setSessionMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setSessionMode(remember ? "remember" : "tab");

    try {
      await login(username, password);
      const after = useAuthStore.getState();
      if (after.user?.role !== "admin") {
        after.clear();
        setError("Akun ini bukan akun admin.");
        setLoading(false);
        return;
      }
      router.replace("/admin");
    } catch (err: any) {
      setError(err?.message || "Login gagal. Periksa username & password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* ── Kiri: branding (navy) ── */}
      <div className="relative hidden w-1/2 overflow-hidden bg-[#0c1e3a] lg:flex lg:items-center lg:justify-center">
        <div className="pointer-events-none absolute -right-20 -top-20 h-[400px] w-[400px] rounded-full border border-white/5 bg-white/[0.02]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-[420px] w-[420px] rounded-full border border-white/5 bg-white/[0.02]" />
        <div className="pointer-events-none absolute left-1/3 top-1/4 h-[200px] w-[200px] rounded-full bg-amber-500/[0.03]" />

        <div className="relative z-10 flex flex-col items-center px-12 text-center">
          <Image src="/logo-icon.png" alt="Tower Control" width={56} height={56} priority className="h-14 w-14 object-contain" />
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white">Tower Control</h1>
          <p className="mt-1.5 text-xs uppercase tracking-[0.3em] text-amber-400/70">Distribution Monitoring System</p>
          <div className="mt-8 h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <p className="mt-6 max-w-xs text-sm leading-relaxed text-blue-100/50">
            Panel administrasi untuk mengelola master data, user, dan konfigurasi sistem logistik.
          </p>
        </div>
      </div>

      {/* ── Kanan: form login (putih) ── */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-[380px]">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <Image src="/logo-icon.png" alt="TC" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold text-[#0c1e3a]">Tower Control</span>
          </div>

          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5">
            <Shield className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-[11px] font-semibold text-amber-700">Administrator Access</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-[#0c1e3a]">Masuk ke Admin Panel</h2>
          <p className="mt-1.5 text-sm text-slate-500">Gunakan akun admin untuk mengakses panel ini.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                placeholder="Masukkan username"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-4 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  placeholder="Masukkan password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRemember((v) => !v)}
                className={`flex h-[18px] w-[18px] items-center justify-center rounded border transition-colors ${
                  remember
                    ? "border-amber-500 bg-amber-500"
                    : "border-slate-300 bg-white hover:border-slate-400"
                }`}
              >
                {remember && (
                  <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className="text-sm text-slate-600">Ingat saya</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0c1e3a] text-sm font-bold text-white shadow-sm transition-all hover:bg-[#152d4f] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Masuk sebagai Admin
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            <a href="/login" className="text-slate-500 underline underline-offset-2 decoration-slate-300 hover:text-[#0c1e3a] transition-colors">
              ← Kembali ke login biasa
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
