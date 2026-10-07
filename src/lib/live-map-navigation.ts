export const LIVE_MAP_PATH = "/armada/live-map";
export const LIVE_MAP_RETURN_KEY = "live-map-return-to";
export function safeMapReturn(value?: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || url.pathname.replace(/\/$/, "") === LIVE_MAP_PATH || /^\/(admin|login)(\/|$)/.test(url.pathname)) return "/";
    return url.pathname + url.search + url.hash;
  } catch { return "/"; }
}