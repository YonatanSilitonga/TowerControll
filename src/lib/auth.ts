import { get, post } from "@/lib/api-client";
import type { AuthResponse, User } from "@/types/auth";

/**
 * Helper auth — dipakai oleh auth-store (Zustand).
 * Semua fungsi di sini murni client-side.
 */

export async function loginRequest(
  username: string,
  password: string
): Promise<AuthResponse> {
  return post<AuthResponse>("/auth/login", { username, password });
}

export async function meRequest(token: string): Promise<User> {
  return get<User>("/auth/me", { token });
}

export async function logoutRequest(token: string): Promise<void> {
  await post<void>("/auth/logout", undefined, { token });
}

/** Ganti password (user yang login) — verifikasi password lama di backend. */
export async function changePasswordRequest(
  token: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  await post<void>(
    "/auth/change-password",
    { old_password: oldPassword, new_password: newPassword },
    { token }
  );
}
