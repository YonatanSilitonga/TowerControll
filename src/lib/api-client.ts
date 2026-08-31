import { ApiError, type ApiResponse } from "@/types/api";
import { API_URL } from "@/lib/constants";
import { mockRequest } from "@/mocks/handlers";

/**
 * API client terpusat untuk backend Tower Control.
 *
 * - Inject `Authorization: Bearer <token>` dari token yang dikirim via argumen.
 * - Paksa header `Accept: application/json` (dibutuhkan Sanctum biar return JSON 401,
 *   bukan redirect ke route login).
 * - Unwrap `{ success, data }` -> langsung balikin `data`.
 * - Lempar `ApiError` terstruktur buat error handling di UI.
 *
 * Mode mock: saat `NEXT_PUBLIC_USE_MOCK=true`, semua request dialihkan ke
 * `src/mocks/handlers.ts` (data contoh) — preview frontend tanpa backend.
 */

interface RequestOptions extends Omit<RequestInit, "body"> {
  token?: string | null;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, body, query, headers, method = "GET", ...rest } = options;

  // Mode mock: langsung balikin data contoh, tanpa fetch.
  if (USE_MOCK) {
    return mockRequest<T>(method, path, query, body);
  }

  // Build query string
  let url = `${API_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    // Wajib kalau backend lewat ngrok-free — biar gak kena halaman warning interstitial.
    "ngrok-skip-browser-warning": "true",
    ...(headers as Record<string, string> | undefined),
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, "Koneksi timeout — server tidak merespon. Silakan coba lagi.");
    }
    throw new ApiError(0, "Gagal menghubungi server. Periksa koneksi jaringan.");
  }
  clearTimeout(timeoutId);

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    // Response bukan JSON (misal server error HTML) — tetap lanjut dengan status.
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.message ??
        (response.status === 401
          ? "Sesi berakhir. Silakan login ulang."
          : "Terjadi kesalahan pada server."),
      (payload as { errors?: Record<string, string[]> })?.errors
    );
  }

  if (payload && typeof payload === "object" && "success" in payload) {
    return payload.data as T;
  }

  // Fallback: kalau response bukan format { success, data }
  return payload as T;
}

/** GET dengan token opsional. */
export const get = <T>(path: string, options?: RequestOptions) =>
  apiRequest<T>(path, { method: "GET", ...options });

/** POST dengan body. */
export const post = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>(path, { method: "POST", body, ...options });

/** PUT / PATCH (update). */
export const put = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>(path, { method: "PUT", body, ...options });

export const patch = <T>(
  path: string,
  body?: unknown,
  options?: RequestOptions
) => apiRequest<T>(path, { method: "PATCH", body, ...options });

/** DELETE. */
export const del = <T>(path: string, options?: RequestOptions) =>
  apiRequest<T>(path, { method: "DELETE", ...options });
