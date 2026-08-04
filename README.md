# TowerControll — Frontend (Web)

> Frontend dashboard **Tower Control** PT Sentral Logistik Bersama.
> Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query + Zustand.

## Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js 14 (App Router) |
| Bahasa | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| Data fetching | TanStack Query (v5) — cache + polling realtime-ready |
| State | Zustand (persist auth) |
| Backend | **Go + Echo + PostgreSQL (Supabase)** (`http://localhost:8080/api/v1`) |

Backend dipakai **bareng dengan app mobile** (driver). Kontrak API bersama di
`D:\Magang\Backend\docs\API_CONTRACT.md`.

## Struktur

```
src/
├── app/                      # Routes (App Router)
│   ├── (auth)/login/         # Halaman login (username + password)
│   └── (dashboard)/          # Group dashboard + guard auth
│       ├── page.tsx          # Dashboard Keseluruhan (route /)
│       ├── armada/           # kendaraan, driver, trip/ritase (perlu disambung)
│       ├── gudang/           # placeholder (belum dikembangkan)
│       ├── absensi/          # placeholder (belum dikembangkan)
│       └── laporan/          # placeholder (belum dikembangkan)
├── components/
│   ├── ui/                   # Komponen shadcn/ui (+ stat-card, status-badge)
│   ├── layout/               # sidebar (role-based), header, page-header
│   └── under-construction.tsx # Placeholder modul belum ada
├── hooks/                    # TanStack Query hooks per resource
├── lib/                      # api-client, constants, utils
├── mocks/                    # Data contoh (mode MOCK preview, tanpa backend)
├── providers/                # QueryProvider
├── stores/                   # Zustand auth store (persist)
└── types/                    # TypeScript types dari response API
```

## Menjalankan

```bash
# 1. Install dependencies
npm install

# 2. Pastikan .env.local (config sudah disediakan, TIDAK di-commit)
#    NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
#    NEXT_PUBLIC_USE_MOCK=false

# 3. Jalankan backend dulu (di repo Backend)
cd D:\Magang\Backend
go run main.go          # → http://localhost:8080/api/v1

# 4. Jalankan dev server frontend
cd D:\Magang\TowerControll
npm run dev             # → http://localhost:3000
```

Login demo: `direktur / direktur123` (juga `kapten/kapten123`, `admin/admin123`, `driver/driver123`).
Web dikhususkan untuk peran **direktur** & **kapten**; **driver** memakai app mobile.

## Integrasi Web ↔ Backend ↔ Database

- Web **hanya frontend** — semua data dari backend Go yang membaca **Supabase PostgreSQL**
  (sumber kebenaran). Web gak nulis langsung ke DB.
- Login via `POST /api/v1/auth/login` dengan `username` *atau* `email` → token **JWT** `{ user, token }`.
  Token dipakai di header `Authorization: Bearer <token>`.
- Peran (role) diambil dari tabel `users`: `admin` | `kapten` | `direktur` | `driver`.
- Endpoint konsisten `{ success, data, message }` — di-unwrap otomatis oleh `src/lib/api-client.ts`.

## Dashboard

Route `/` menampilkan **KPI real** dari DB:

- **KPI cards** — Total AWB Hari Ini, Armada Aktif, Driver Bertugas, Ritase Aktif, Total Seller,
  Ritase Selesai, Total Koli, Paket Tertinggal, Drop Point, Armada Idle.
- **Ringkasan Operasional** — tabel metrik armada/driver/ritase real.
- **Durasi Proses** — rata-rata loading/perjalanan/unloading dari timeline `ritase_event`.
- **Potensi Hambatan (Bottleneck)** & **Alert Anomali** — deteksi dari `GET /dashboard/analisis`.
- Data diambil via `GET /dashboard/summary` + `GET /dashboard/analisis` dengan **polling 30 detik**
  (`src/hooks/use-dashboard.ts`, siap di-upgrade ke WebSocket).

## Mode Mock (Preview Tanpa Backend)

Saat `NEXT_PUBLIC_USE_MOCK=true`, semua request dialihkan ke `src/mocks/` (data contoh),
jadi frontend bisa di-preview penuh **tanpa backend**:

```bash
npm run dev        # login: isi username & password apa saja
```

- Login bebas (token palsu), dashboard & halaman terisi data contoh.
- Tampil badge **MOCK** di header sebagai penanda.
- Mau connect ke backend beneran? Ubah `NEXT_PUBLIC_USE_MOCK=false` (dan backend harus jalan).

## Pola Penting

- **API client terpusat** (`src/lib/api-client.ts`) — inject `Authorization: Bearer`, `Accept: application/json`,
  auto-unwrap `{ success, data }`, lempar `ApiError`. Saat mock aktif, request dialihkan ke `src/mocks/handlers.ts`.
- **Auth** — token JWT disimpan di localStorage via Zustand persist. Guard: client-side di `(dashboard)/layout.tsx`
  (redirect ke `/login` kalau belum ada token).
- **Role-based menu** — menu sidebar disaring dari `ROLE_MENU` di `src/lib/constants.ts`
  (`admin/kapten/direktur/driver`).
- **Status label Indonesia** — status DB (berjalan/selesai/bertugas/libur/ber/available) dipetakan di
  `src/lib/constants.ts` `STATUS_LABELS`.
- **Realtime** — Dashboard pakai `refetchInterval` (30s). Saat backend siap WebSocket, tinggal ganti sumber query.

## Roadmap Frontend

- [ ] Sambung modul **Armada** ke endpoint `/armada/kendaraan`, `/armada/driver`, `/armada/ritase`
- [ ] Guard role web (hanya direktur/kapten) di backend + frontend
- [ ] Modul Gudang, Absensi, Laporan
- [ ] CRUD form lengkap (create/update) per modul
- [ ] Pagination & debounce search
- [ ] WebSocket realtime (pengganti polling)
- [ ] Dark mode toggle