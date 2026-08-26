"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { Eye, EyeOff, Shield } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
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
    <div className="flex min-h-screen bg-[#0c1e3a]">
      {/* Kiri — dekorasi */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#123665]/60" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-[420px] w-[420px] rounded-full bg-[#06182f]/80" />
        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          <Image src="/logo-icon.png" alt="Tower Control" width={64} height={64} priority className="h-16 w-16 object-contain" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">Tower Control</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-blue-200/70">Distribution Monitoring System</p>
          <p className="mt-6 max-w-xs text-sm text-blue-100/60">Panel administrasi untuk mengelola master data, user, dan konfigurasi sistem.</p>
        </div>
      </div>

      {/* Kanan — form login */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Image src="/logo-icon.png" alt="TC" width={32} height={32} className="h-8 w-8 object-contain" />
            <span className="text-lg font-bold text-white">Tower Control</span>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20">
              <Shield className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Admin Panel</h2>
              <p className="text-xs text-slate-400">Akses khusus administrator</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                placeholder="Masukkan username"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-colors"
                  placeholder="Masukkan password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-bold text-[#0c1e3a] transition-colors hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? "Masuk…" : "Masuk sebagai Admin"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            <a href="/login" className="text-slate-400 hover:text-white transition-colors">
              ← Kembali ke login biasa
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
