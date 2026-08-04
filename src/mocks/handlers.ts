/**
 * Router mock — meniru perilaku backend Tower Control.
 * Dipanggil dari api-client saat NEXT_PUBLIC_USE_MOCK=true.
 */

import { ApiError } from "@/types/api";
import type { AuthResponse, User } from "@/types/auth";
import {
  mockDashboard,
  mockDrivers,
  mockFleets,
  mockTrips,
  mockVehicles,
} from "./data";

/** Simulasi latency jaringan. */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const simulateLatency = () => delay(250 + Math.random() * 350);

const MOCK_USER: User = {
  id_user: 1,
  username: "direktur",
  name: "Direktur Operasional",
  role: "direktur",
};

const MOCK_TOKEN = "mock-token-1|abcdef0123456789";

export async function mockRequest<T>(
  method: string,
  path: string,
  query?: Record<string, string | number | undefined>,
  body?: unknown
): Promise<T> {
  await simulateLatency();

  /* ---------- Auth ---------- */
  if (method === "POST" && path === "/auth/login") {
    const { username, password } = (body ?? {}) as { username?: string; password?: string };
    if (!username || !password) {
      throw new ApiError(422, "Username dan password wajib diisi.");
    }
    const res: AuthResponse = { user: { ...MOCK_USER, username }, token: MOCK_TOKEN };
    return res as T;
  }

  if (method === "GET" && path === "/auth/me") {
    return MOCK_USER as T;
  }

  if (method === "POST" && path === "/auth/logout") {
    return undefined as T;
  }

  /* ---------- Dashboard ---------- */
  if (method === "GET" && path === "/dashboard/summary") {
    return mockDashboard as T;
  }

  if (method === "GET" && path === "/dashboard/analisis") {
    return {
      durasi: {
        rata_rata_loading: "40 menit",
        rata_rata_perjalanan: "3.2 jam",
        rata_rata_unloading: "25 menit",
        total_ritase_dihitung: 8,
      },
      bottleneck: [
        { kategori: "seller", label: "Kacamata Group", indikator: "ritase terbanyak", nilai: 3 },
      ],
      alerts: [
        {
          tingkat: "warning",
          pesan: "Ritase RTS-0001 berhenti lebih dari 3 jam tanpa update",
          kategori: "kendaraan_berhenti",
          waktu: new Date().toISOString(),
        },
      ],
    } as T;
  }

  /* ---------- Armada ---------- */
  if (method === "GET" && path === "/armada/fleets") return mockFleets as T;
  if (method === "POST" && path === "/armada/fleets") return (body ?? {}) as T;
  if (method === "GET" && path === "/armada/vehicles") return mockVehicles as T;
  if (method === "POST" && path === "/armada/vehicles") return (body ?? {}) as T;
  if (method === "GET" && path === "/armada/drivers") return mockDrivers as T;
  if (method === "POST" && path === "/armada/drivers") return (body ?? {}) as T;
  if (method === "GET" && path === "/armada/trips") return mockTrips as T;
  if (method === "POST" && path === "/armada/trips") return (body ?? {}) as T;

  const vehicleStatus = path.match(/^\/armada\/vehicles\/([^/]+)\/status$/);
  if (method === "PATCH" && vehicleStatus) {
    const v = mockVehicles.find((x) => x.id === vehicleStatus[1]);
    if (v) v.status = ((body as { status?: string })?.status as typeof v.status) ?? v.status;
    return v as T;
  }
  const tripStatus = path.match(/^\/armada\/trips\/([^/]+)\/status$/);
  if (method === "PATCH" && tripStatus) {
    const t = mockTrips.find((x) => x.id === tripStatus[1]);
    if (t) t.status = ((body as { status?: string })?.status as typeof t.status) ?? t.status;
    return t as T;
  }

  /* ---------- Fallback ---------- */
  throw new ApiError(404, `Mock: endpoint tidak dikenali ${method} ${path}`);
}
