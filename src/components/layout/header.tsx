"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, KeyRound, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL, USE_MOCK } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";
import { changePasswordRequest } from "@/lib/auth";
import { MobileNav } from "@/components/layout/mobile-nav";

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const token = useAuthStore((s) => s.token);

  // State modal ganti password
  const [showChangePw, setShowChangePw] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleChangePassword = async () => {
    setPwError(null);
    if (!oldPw || !newPw || !confirmPw) {
      setPwError("Semua field wajib diisi.");
      return;
    }
    if (newPw.length < 6) {
      setPwError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Konfirmasi password tidak sama.");
      return;
    }
    setPwLoading(true);
    try {
      if (!token) throw new Error("Sesi tidak valid. Silakan login ulang.");
      await changePasswordRequest(token, oldPw, newPw);
      // Sukses → logout & login ulang dengan password baru
      await handleLogout();
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Gagal mengganti password.");
      setPwLoading(false);
    }
  };

  const closePwModal = () => {
    if (pwLoading) return;
    setShowChangePw(false);
    setPwError(null);
    setOldPw("");
    setNewPw("");
    setConfirmPw("");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 dark:bg-background">
      <div className="flex items-center gap-3">
        <MobileNav />
        <span className="text-[15px] font-bold tracking-tight text-[#0c1e3a]">
          Tower Control
        </span>
        {USE_MOCK && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
            Mock
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative text-slate-500">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-emerald-500" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full outline-none">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0c1e3a] text-sm font-bold text-amber-400">
                {user?.name?.charAt(0) ?? "A"}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{user?.name ?? "-"}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {user?.username} · {user?.role ? ROLE_LABEL[user.role] : "-"}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowChangePw(true)}>
              <KeyRound />
              Ganti Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modal ganti password */}
      {showChangePw && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={closePwModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Ganti Password</h3>
              <button
                type="button"
                onClick={closePwModal}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChangePassword();
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <Label htmlFor="old-pw" className="text-sm font-semibold text-slate-700">
                  Password Lama
                </Label>
                <Input
                  id="old-pw"
                  type="password"
                  value={oldPw}
                  onChange={(e) => setOldPw(e.target.value)}
                  className="mt-1"
                  autoComplete="current-password"
                />
              </div>
              <div>
                <Label htmlFor="new-pw" className="text-sm font-semibold text-slate-700">
                  Password Baru
                </Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="mt-1"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirm-pw" className="text-sm font-semibold text-slate-700">
                  Konfirmasi Password Baru
                </Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="mt-1"
                  autoComplete="new-password"
                />
              </div>

              {pwError && (
                <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                  {pwError}
                </p>
              )}

              <Button
                type="submit"
                disabled={pwLoading}
                className="h-11 w-full bg-[#0c1e3a] text-sm font-semibold text-white hover:bg-[#16335a]"
              >
                {pwLoading ? "Menyimpan..." : "Simpan & Login Ulang"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
