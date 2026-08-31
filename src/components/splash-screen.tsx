"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { ROLE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const DURATION_MS = 2000;
const SKIP_AFTER_MS = 800;
const FADE_MS = 500;

/** Sapaan sesuai jam WIB. */
function greetingByTime(): string {
  const hour = new Intl.DateTimeFormat("id-ID", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date());
  const h = Number(hour);
  if (h >= 5 && h < 11) return "Selamat pagi";
  if (h >= 11 && h < 15) return "Selamat siang";
  if (h >= 15 && h < 18) return "Selamat sore";
  return "Selamat malam";
}

/**
 * Splash screen brand — tampil saat full-load (buka pertama / waktu login).
 * Sapaan waktu + personal (nama user kalau store sudah hydrate).
 * Auto-dismiss ~2 detik, bisa di-skip, fade-out halus lalu unmount.
 */
export function SplashScreen() {
  const name = useAuthStore((s) => s.user?.name);
  const role = useAuthStore((s) => s.user?.role);
  const [mounted, setMounted] = useState(true);
  const [visible, setVisible] = useState(true);
  const [showSkip, setShowSkip] = useState(false);
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  const greeting = useMemo(() => greetingByTime(), []);

  const dismiss = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setVisible(false);
    setTimeout(() => setMounted(false), FADE_MS);
  };

  useEffect(() => {
    const skipTimer = setTimeout(() => setShowSkip(true), SKIP_AFTER_MS);
    const autoTimer = setTimeout(dismiss, DURATION_MS);
    return () => {
      clearTimeout(skipTimer);
      clearTimeout(autoTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Progress bar — mengisi linear selama DURATION_MS.
  useEffect(() => {
    if (!mounted) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min(100, ((now - start) / DURATION_MS) * 100);
      setProgress(p);
      if (p < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#0c1e3a] transition-opacity duration-500",
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!visible}
    >
      {/* organic blobs — selaras tema login panel kiri */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[#123665]/60" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-[420px] w-[420px] rounded-full bg-[#06182f]/80" />

      {/* konten */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="animate-[fade-in-up_0.6s_ease-out]">
          <Image
            src="/logo-icon.png"
            alt="Tower Control"
            width={72}
            height={72}
            priority
            className="h-[72px] w-[72px] object-contain"
          />
        </div>

        <h1 className="mt-4 animate-[fade-in-up_0.6s_ease-out_0.1s_both] text-2xl font-bold tracking-tight text-white">
          Tower Control
        </h1>
        <p className="mt-1 animate-[fade-in-up_0.6s_ease-out_0.15s_both] text-[10px] uppercase tracking-[0.25em] text-blue-200/70">
          Distribution Monitoring System
        </p>

        <p
          role="status"
          aria-live="polite"
          className="mt-8 animate-[fade-in-up_0.6s_ease-out_0.2s_both] text-lg font-semibold text-white"
        >
          {greeting}
          {role ? `, ${ROLE_LABEL[role]}!` : "!"}
        </p>
        <p className="mt-1.5 animate-[fade-in-up_0.6s_ease-out_0.25s_both] text-sm text-blue-100/60">
          {role
            ? "Menyiapkan dashboard operasionalmu…"
            : "Siap mengawal operasional hari ini?"}
        </p>
      </div>

      {/* progress + skip */}
      <div className="absolute bottom-10 left-1/2 z-10 w-full max-w-[240px] -translate-x-1/2 px-6">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-amber-400 transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        {showSkip && (
          <button
            type="button"
            onClick={dismiss}
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 rounded-md px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Lewati splash screen"
          >
            Lewati →
          </button>
        )}
      </div>
    </div>
  );
}
