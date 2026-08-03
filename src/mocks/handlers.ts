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
  id: "usr-mock-001",
  name: "Admin Operator",
  email: "admin@slb.co.id",
  role: "admin",
  active: true,
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
    const { email, password } = (body ?? {}) as { email?: string; password?: string };
    if (!email || !password) {
      throw new ApiError(422, "Email dan password wajib diisi.");
    }
    const res: AuthResponse = { user: { ...MOCK_USER, email }, token: MOCK_TOKEN };
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
