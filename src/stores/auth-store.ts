"use client";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type PersistStorage,
  type StateStorage,
} from "zustand/middleware";
import { loginRequest, logoutRequest, meRequest } from "@/lib/auth";
import type { User } from "@/types/auth";

/**
 * Mode sesi dari halaman login:
 * - "remember" -> sesi bertahan setelah browser ditutup (localStorage).
 * - "tab"      -> sesi hanya untuk tab ini: TETAP login saat refresh,
 *                 tapi hilang saat tab/browser ditutup (marker sessionStorage).
 */
type SessionMode = "remember" | "tab";

/** Marker sessionStorage penanda tab masih hidup (bertahan saat refresh, hilang saat tab tutup). */
const TAB_MARKER = "tc-tab-session";

const sessionAwareStorage: StateStorage = {
  getItem: (name) => {
    const raw = window.localStorage.getItem(name);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Sesi mode "tab": valid hanya selama marker sessionStorage masih ada.
        // Setelah tab/browser ditutup, marker hilang → sesi dibersihkan.
        if (
          parsed?.state?.sessionMode === "tab" &&
          !window.sessionStorage.getItem(TAB_MARKER)
        ) {
          window.localStorage.removeItem(name);
          window.sessionStorage.removeItem(name);
          return null;
        }
      } catch {
        // Data korup — biarkan raw diproses persist, tidak perlu error.
      }
      return raw;
    }
    // Kompatibilitas data lama yang sempat tersimpan di sessionStorage.
    return window.sessionStorage.getItem(name);
  },
  setItem: (name, value) => {
    try {
      const parsed = JSON.parse(value);
      if (parsed?.state?.sessionMode === "tab") {
        window.sessionStorage.setItem(TAB_MARKER, "1");
      } else {
        window.sessionStorage.removeItem(TAB_MARKER);
      }
    } catch {
      window.sessionStorage.removeItem(TAB_MARKER);
    }
    // Data utama selalu di localStorage; marker sessionStorage yang jadi
    // pembeda "tab-only" vs "remember" (bukan lokasi data).
    window.localStorage.setItem(name, value);
    window.sessionStorage.removeItem(name);
  },
  removeItem: (name) => {
    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
    window.sessionStorage.removeItem(TAB_MARKER);
  },
};

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  hasHydrated: boolean;
  sessionMode: SessionMode;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clear: () => void;
  setHasHydrated: (v: boolean) => void;
  setSessionMode: (mode: SessionMode) => void;
}

const TOKEN_KEY = "tc-token";
const USER_KEY = "tc-user";

/** Bentuk state yang dipersist (hasil partialize). */
type PersistedAuth = {
  user: User | null;
  token: string | null;
  sessionMode: SessionMode;
};

/**
 * Auth store dengan persist.
 * Token disimpan plain text (SPA token Sanctum). Untuk produksi lebih ketat,
 * pertimbangkan httpOnly cookie + CSRF protection.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,
      hasHydrated: false,
      sessionMode: "remember",

      login: async (username, password) => {
        set({ loading: true });
        try {
          const { user, token } = await loginRequest(username, password);
          set({ user, token, loading: false });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      fetchMe: async () => {
        const { token } = get();
        if (!token) return;
        try {
          const user = await meRequest(token);
          set({ user });
        } catch {
          // Token invalid/expired — bersihkan sesi
          get().clear();
        }
      },

      logout: async () => {
        const { token } = get();
        if (token) {
          try {
            await logoutRequest(token);
          } catch {
            // Abaikan error saat logout — tetap bersihkan lokal
          }
        }
        get().clear();
      },

      clear: () =>
        set({ user: null, token: null, loading: false, sessionMode: "remember" }),

      setHasHydrated: (v) => set({ hasHydrated: v }),

      setSessionMode: (mode) => set({ sessionMode: mode }),
    }),
    {
      name: "tower-control-auth",
      storage: createJSONStorage(
        () => sessionAwareStorage
      ) as PersistStorage<PersistedAuth>,
      partialize: (state): PersistedAuth => ({
        user: state.user,
        token: state.token,
        sessionMode: state.sessionMode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export const TOKEN_STORAGE_KEY = TOKEN_KEY;
export const USER_STORAGE_KEY = USER_KEY;
