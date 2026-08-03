"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loginRequest, logoutRequest, meRequest } from "@/lib/auth";
import type { User } from "@/types/auth";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clear: () => void;
}

const TOKEN_KEY = "tc-token";
const USER_KEY = "tc-user";

/**
 * Auth store dengan persist ke localStorage.
 * Token disimpan plain text (SPA token Sanctum). Untuk produksi lebih ketat,
 * pertimbangkan httpOnly cookie + CSRF protection.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,

      login: async (email, password) => {
        set({ loading: true });
        try {
          const { user, token } = await loginRequest(email, password);
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

      clear: () => set({ user: null, token: null, loading: false }),
    }),
    {
      name: "tower-control-auth",
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

export const TOKEN_STORAGE_KEY = TOKEN_KEY;
export const USER_STORAGE_KEY = USER_KEY;
