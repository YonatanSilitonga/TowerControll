"use client";

import { API_URL } from "@/lib/constants";

/**
 * Client SSE ringan via fetch + ReadableStream (browser modern).
 * `fetch` bisa set header Authorization (EventSource bawaan tidak bisa),
 * jadi token gak bocor ke URL.
 *
 * Fitur:
 * - Auto-reconnect dengan backoff (2s → 5s → 15s, cap 15s).
 * - Abort bersih saat unmount.
 * - `onStatus` callback untuk indikator koneksi di UI (connected/reconnecting).
 */

type Status = "connecting" | "connected" | "reconnecting" | "disconnected";

/** Payload yang dikirim backend Go tiap tick SSE. */
export interface LivePayload {
  type?: string;
  ts?: string;
  data?: {
    summary?: unknown;
    analisis?: unknown;
    map?: unknown;
  };
}

interface SSEOptions {
  url: string;
  headers?: Record<string, string>;
  onMessage: (payload: LivePayload) => void;
  onStatus?: (status: Status) => void;
  /** Nonaktifkan reconnect (untuk logout/unmount). */
  reconnect?: boolean;
}

class RealtimeConnection {
  private controller: AbortController | null = null;
  private stopped = false;
  private retryDelay = 2000;
  private lastEventAt = 0;
  private watchdog: number | null = null;
  private forceReconnect = false;

  constructor(private opts: SSEOptions) {}

  private startWatchdog(): void {
    if (this.watchdog != null) return;
    // Cek tiap 10 detik: kalau >30 detik gak ada event (proxy buffering /
    // server diam-diam mati) → paksa putus stream biar reconnect jalan.
    this.lastEventAt = Date.now();
    this.watchdog = window.setInterval(() => {
      if (Date.now() - this.lastEventAt > 30_000) {
        console.warn("[SSE] watchdog: tidak ada event >30s, paksa reconnect");
        this.forceReconnect = true;
        this.controller?.abort();
      }
    }, 10_000);
  }

  private stopWatchdog(): void {
    if (this.watchdog != null) {
      window.clearInterval(this.watchdog);
      this.watchdog = null;
    }
  }

  async start(): Promise<void> {
    const { url, headers, onMessage, onStatus } = this.opts;
    onStatus?.("connecting");

    try {
      this.controller = new AbortController();
      const res = await fetch(url, {
        headers: { Accept: "text/event-stream", ...headers },
        cache: "no-store",
        signal: this.controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`SSE HTTP ${res.status}`);
      }

      onStatus?.("connected");
      this.retryDelay = 2000; // reset backoff setelah connect sukses
      this.forceReconnect = false;
      this.startWatchdog();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse baris "data: <json>"
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);
          if (line.startsWith("data:")) {
            const raw = line.slice(5).trim();
            if (raw) {
              try {
                onMessage(JSON.parse(raw));
                this.lastEventAt = Date.now();
              } catch {
                /* abaikan chunk yang gak valid */
              }
            }
          }
        }
      }
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      if ((aborted && !this.forceReconnect) || this.stopped) {
        return; // intentional stop
      }
      this.forceReconnect = false;
      this.opts.onStatus?.("reconnecting");
    }

    this.stopWatchdog();

    // Stream putus — reconnect kalau masih mau jalan.
    if (!this.stopped && this.opts.reconnect !== false) {
      setTimeout(() => {
        if (!this.stopped) {
          this.retryDelay = Math.min(this.retryDelay * 1.5, 15000);
          void this.start();
        }
      }, this.retryDelay);
    } else {
      onStatus?.("disconnected");
    }
  }

  stop(): void {
    this.stopped = true;
    this.stopWatchdog();
    this.controller?.abort();
    this.opts.onStatus?.("disconnected");
  }
}

let active: RealtimeConnection | null = null;
let currentToken: string | null = null;

/**
 * Hubungkan SSE ke /realtime/live. Satu koneksi per token.
 * Kalau token berubah (login/logout), koneksi lama di-stop & diganti.
 */
export function connectRealtime(options: {
  token: string;
  onMessage: (payload: LivePayload) => void;
  onStatus?: (status: Status) => void;
}) {
  if (active && currentToken === options.token) {
    return active; // sudah terkoneksi dengan token yang sama
  }
  // Token berubah → stop yang lama.
  active?.stop();
  active = null;

  currentToken = options.token;
  const conn = new RealtimeConnection({
    url: `${API_URL}/realtime/live`,
    headers: {
      Authorization: `Bearer ${options.token}`,
      "ngrok-skip-browser-warning": "true",
    },
    onMessage: options.onMessage,
    onStatus: options.onStatus,
  });
  active = conn;
  void conn.start();
  return conn;
}

/** Stop koneksi global (saat logout). */
export function disconnectRealtime() {
  active?.stop();
  active = null;
  currentToken = null;
}
