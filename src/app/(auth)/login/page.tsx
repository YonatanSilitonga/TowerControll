"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import {
  Eye,
  EyeOff,
  LifeBuoy,
  Lock,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { ApiError } from "@/types/api";
import { USE_MOCK } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";

/* =========================================================
   DECORATIVE DOT PATTERN
========================================================= */

function DotPattern({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden
    >
      {[...Array(5)].map((_, r) =>
        [...Array(5)].map((_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={8 + c * 16}
            cy={8 + r * 16}
            r="1.5"
            fill="currentColor"
          />
        ))
      )}
    </svg>
  );
}

/* =========================================================
   LOGIN FORM
========================================================= */

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next") ?? "/";

  const login = useAuthStore((s) => s.login);
  const setSessionMode = useAuthStore((s) => s.setSessionMode);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /* =======================================================
     LOGIN
  ======================================================= */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError(null);
    setSubmitting(true);

    setSessionMode(remember ? "remember" : "tab");

    try {
      await login(username, password);
      const role = useAuthStore.getState().user?.role;
      if (role === "admin") {
        router.replace("/admin");
      } else {
        router.replace(next);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Login gagal. Coba lagi."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">

      {/* =====================================================
          LEFT PANEL
      ===================================================== */}

      <aside
        className="
          relative
          hidden
          min-h-screen
          w-[58%]
          overflow-hidden
          bg-[#0b1d3a]
          lg:flex
        "
      >

        {/* ---------------------------------------------------
            BACKGROUND SHAPES
        --------------------------------------------------- */}

        <div
          aria-hidden
          className="
            pointer-events-none
            absolute
            -right-40
            -top-40
            h-[620px]
            w-[620px]
            rounded-full
            bg-[#123665]
            opacity-60
          "
        />

        <div
          aria-hidden
          className="
            pointer-events-none
            absolute
            -bottom-56
            -left-40
            h-[520px]
            w-[520px]
            rounded-full
            bg-[#07172d]
          "
        />

        {/* ---------------------------------------------------
            ORGANIC WAVE
        --------------------------------------------------- */}

        <svg
          className="
            pointer-events-none
            absolute
            inset-0
            h-full
            w-full
          "
          viewBox="0 0 900 1000"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="
              M0 0
              H900
              V1000
              H0
              Z
            "
            fill="#0b1d3a"
          />

          <path
            d="
              M900 0
              C780 100 830 210 755 320
              C690 430 815 530 725 660
              C650 775 770 900 680 1000
              H900
              Z
            "
            fill="#102b52"
            opacity="0.72"
          />
        </svg>

        {/* ---------------------------------------------------
            TOP DOTS
        --------------------------------------------------- */}

        <DotPattern
          className="
            pointer-events-none
            absolute
            left-8
            top-8
            z-20
            text-white/[0.08]
          "
        />

        {/* ===================================================
            BRAND
        =================================================== */}

        <div
          className="
            absolute
            left-10
            top-9
            z-30
            xl:left-12
          "
        >
          <div className="flex items-center gap-3">

            <Image
              src="/logo-icon.png"
              alt="Tower Control"
              width={42}
              height={42}
              priority
              className="h-10 w-10 object-contain"
            />

            <div className="leading-tight">

              <p className="text-[15px] font-bold text-white">
                Tower Control
              </p>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  uppercase
                  tracking-[0.15em]
                  text-blue-200/70
                "
              >
                Distribution Monitoring System
              </p>

            </div>

          </div>
        </div>

        {/* ===================================================
            SCRIM — biar teks kebaca walau gambar di belakang
        =================================================== */}

        <div
          aria-hidden
          className="
            pointer-events-none
            absolute
            left-0
            top-0
            z-[25]
            h-[58%]
            w-[70%]
            bg-gradient-to-r
            from-[#0b1d3a]/95
            via-[#0b1d3a]/55
            to-transparent
          "
        />

        {/* ===================================================
            HEADLINE
        =================================================== */}

        <div
          className="
            absolute
            left-10
            top-[23%]
            z-30
            max-w-[440px]
            [text-shadow:0_1px_4px_#0b1d3a,0_4px_24px_rgba(11,29,58,0.95)]
            xl:left-12
          "
        >

          {/* live badge */}

          <div
            className="
              mb-5
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              border-white/[0.06]
              bg-white/[0.08]
              px-3.5
              py-2
              text-xs
              font-medium
              text-blue-100
              backdrop-blur-sm
            "
          >
            <span
              className="
                h-2
                w-2
                animate-pulse
                rounded-full
                bg-emerald-400
              "
            />

            LIVE · MONITORING REAL-TIME
          </div>

          <h1
            className="
              text-3xl
              font-bold
              leading-[1.15]
              tracking-tight
              text-white
              xl:text-[38px]
            "
          >
            Pantau armada,
            <br />
            kendalikan operasional.
          </h1>

          <p
            className="
              mt-5
              max-w-[390px]
              text-sm
              leading-6
              text-blue-100/65
            "
          >
            Sistem monitoring distribusi secara real-time
            untuk mendukung keputusan yang lebih cepat
            dan akurat.
          </p>

        </div>

        {/* ===================================================
            MAIN ILLUSTRATION
        =================================================== */}

<div
          className="
            pointer-events-none
            absolute
            bottom-[-60px]
            right-[-8%]
            z-20
            h-[90%]
            w-[100%]
          "
        >
          <Image
            src="/login.png"
            alt="Fleet monitoring illustration"
            fill
            priority
            sizes="58vw"
            className="
              object-contain
              object-[right_bottom]
            "
          />
        </div>

        {/* ===================================================
            DECORATIVE ROUTE LINE
        =================================================== */}

        <svg
          className="
            pointer-events-none
            absolute
            bottom-12
            left-0
            z-10
            h-32
            w-full
            opacity-30
          "
          viewBox="0 0 900 130"
          fill="none"
          aria-hidden
        >
          <path
            d="
              M0 100
              C180 25 300 120 470 65
              C620 10 720 85 900 30
            "
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="7 9"
          />
        </svg>

      </aside>


      {/* =====================================================
          RIGHT PANEL
      ===================================================== */}

      <main
        className="
          relative
          flex
          min-h-screen
          flex-1
          items-center
          justify-center
          overflow-hidden
          bg-white
          px-6
          py-10
          sm:px-10
          lg:w-[42%]
        "
      >

        {/* ---------------------------------------------------
            TOP RIGHT DECORATION
        --------------------------------------------------- */}

        <div
          aria-hidden
          className="
            pointer-events-none
            absolute
            -right-32
            -top-32
            h-[360px]
            w-[360px]
            rounded-full
            bg-[#eef4ff]
          "
        />

        {/* ---------------------------------------------------
            BOTTOM RIGHT DECORATION
        --------------------------------------------------- */}

        <div
          aria-hidden
          className="
            pointer-events-none
            absolute
            -bottom-40
            -right-32
            h-[420px]
            w-[420px]
            rounded-full
            bg-[#f6f9ff]
          "
        />

        <DotPattern
          className="
            pointer-events-none
            absolute
            right-8
            top-8
            text-[#1e40af]/[0.12]
          "
        />

        {/* ---------------------------------------------------
            BOTTOM CURVE
        --------------------------------------------------- */}

        <svg
          className="
            pointer-events-none
            absolute
            bottom-0
            right-0
            h-52
            w-96
            opacity-20
          "
          viewBox="0 0 400 200"
          fill="none"
          aria-hidden
        >
          <path
            d="
              M0 180
              C100 90 160 180 250 100
              C310 50 350 70 400 20
            "
            stroke="#1e40af"
            strokeWidth="2"
          />

          <circle
            cx="250"
            cy="100"
            r="5"
            fill="#1e40af"
          />
        </svg>


        {/* ===================================================
            LOGIN CONTENT
        =================================================== */}

        <div
          className="
            relative
            z-10
            w-full
            max-w-[400px]
          "
        >

          {/* top accent */}

          <div className="mb-7 flex items-center gap-2">

            <div
              className="
                h-[3px]
                w-9
                rounded-full
                bg-[#0b1d3a]
              "
            />

            <div
              className="
                h-2
                w-2
                rounded-full
                bg-[#2563eb]
              "
            />

          </div>


          {/* =================================================
              HEADING
          ================================================= */}

          <div className="mb-9">

            <h2
              className="
                text-[28px]
                font-bold
                tracking-tight
                text-[#0b1d3a]
              "
            >
              Masuk Tower Control
            </h2>

            <p
              className="
                mt-2
                text-sm
                leading-6
                text-slate-500
              "
            >
              PT Sentral Logistik Bersama — masuk untuk
              melanjutkan.
            </p>

          </div>


          {/* =================================================
              FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* USERNAME */}

            <div className="space-y-2">

              <Label
                htmlFor="username"
                className="
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Username
              </Label>

              <div className="relative">

                <User
                  className="
                    pointer-events-none
                    absolute
                    left-3.5
                    top-1/2
                    z-10
                    h-4
                    w-4
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <Input
                  id="username"
                  type="text"
                  placeholder="direktur"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  required
                  autoComplete="username"
                  className="
                    h-[54px]
                    rounded-xl
                    border-slate-200
                    bg-white
                    pl-10
                    text-sm
                    shadow-sm
                    transition
                    focus:border-[#1e40af]
                    focus:ring-4
                    focus:ring-[#1e40af]/10
                  "
                />

              </div>

            </div>


            {/* PASSWORD */}

            <div className="space-y-2">

              <Label
                htmlFor="password"
                className="
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                Password
              </Label>

              <div className="relative">

                <Lock
                  className="
                    pointer-events-none
                    absolute
                    left-3.5
                    top-1/2
                    z-10
                    h-4
                    w-4
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <Input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  autoComplete="current-password"
                  className="
                    h-[54px]
                    rounded-xl
                    border-slate-200
                    bg-white
                    pl-10
                    pr-11
                    text-sm
                    shadow-sm
                    transition
                    focus:border-[#1e40af]
                    focus:ring-4
                    focus:ring-[#1e40af]/10
                  "
                />

                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) =>
                    e.preventDefault()
                  }
                  onClick={() =>
                    setShowPassword((v) => !v)
                  }
                  aria-label={
                    showPassword
                      ? "Sembunyikan password"
                      : "Tampilkan password"
                  }
                  aria-pressed={showPassword}
                  className="
                    absolute
                    right-0
                    top-0
                    flex
                    h-full
                    items-center
                    rounded-md
                    px-3
                    text-slate-400
                    transition-colors
                    hover:text-[#0b1d3a]
                  "
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>

              </div>

            </div>


            {/* REMEMBER */}

            <label
              className="
                flex
                cursor-pointer
                select-none
                items-center
                gap-2.5
                text-sm
                text-slate-600
              "
            >

              <input
                type="checkbox"
                checked={remember}
                onChange={(e) =>
                  setRemember(e.target.checked)
                }
                className="
                  h-4
                  w-4
                  rounded
                  border-slate-300
                  accent-[#0b1d3a]
                "
              />

              Ingat saya

            </label>


            {/* ERROR */}

            {error && (
              <p
                className="
                  rounded-xl
                  bg-red-50
                  px-4
                  py-3
                  text-sm
                  text-red-600
                "
              >
                {error}
              </p>
            )}


            {/* SUBMIT */}

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="
                h-[54px]
                w-full
                rounded-xl
                bg-[#0b1d3a]
                text-sm
                font-semibold
                text-white
                shadow-lg
                shadow-[#0b1d3a]/20
                transition-all
                hover:bg-[#123665]
                hover:shadow-xl
                active:scale-[0.99]
              "
            >
              {submitting ? "Masuk..." : "Masuk"}
            </Button>


            {/* MOCK */}

            {USE_MOCK && (
              <p
                className="
                  flex
                  items-center
                  justify-center
                  gap-1.5
                  text-center
                  text-xs
                  text-slate-400
                "
              >
                <LifeBuoy className="h-3.5 w-3.5" />
                Mode MOCK: isi username & password apa saja
              </p>
            )}

          </form>


          {/* =================================================
              FOOTER
          ================================================= */}

          <div
            className="
              mt-10
              flex
              items-center
              justify-center
              gap-2.5
              text-sm
              text-slate-500
            "
          >

            <Image
              src="/SLB%20Logo.png"
              alt="PT Sentral Logistik Bersama"
              width={80}
              height={38}
              className="
                h-[38px]
                w-auto
                object-contain
              "
            />

            © {new Date().getFullYear()} PT Sentral Logistik Bersama

          </div>

        </div>

      </main>

    </div>
  );
}


/* =========================================================
   PAGE
========================================================= */

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
