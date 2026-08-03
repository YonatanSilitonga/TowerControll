# TowerControll — Frontend

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
| Backend | Laravel 12 API + MongoDB (`http://127.0.0.1:8000/api/v1`) |

## Struktur

```
src/
├── app/                      # Routes (App Router)
│   ├── (auth)/login/         # Halaman login
│   └── (dashboard)/          # Group dashboard + guard auth
│       ├── page.tsx          # Dashboard Keseluruhan (route /)
│       ├── armada/           # fleet, kendaraan, driver, trip
│       ├── gudang/           # placeholder (belum dikembangkan)
│       ├── absensi/          # placeholder (belum dikembangkan)
│       └── laporan/          # placeholder (belum dikembangkan)
├── components/
│   ├── ui/                   # Komponen shadcn/ui (+ stat-card, progress warna)
│   ├── layout/               # sidebar (dark navy, role-based), header, page-header
│   └── under-construction.tsx # Placeholder modul belum ada
├── hooks/                    # TanStack Query hooks per resource
├── lib/                      # api-client, constants, utils
├── providers/                # QueryProvider
├── stores/                   # Zustand auth store (persist)
└── types/                    # TypeScript types dari response API
```

## Menjalankan

```bash
# 1. Install dependencies
npm install

# 2. Pastikan .env.local (sudah disediakan)
#    NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1

# 3. Jalankan dev server
npm run dev        # → http://localhost:3000
```

Login demo: `admin@slb.co.id` / `password123`

> **Catatan:** Backend harus jalan dulu (`php artisan serve` di D:\Magang\Backend).

## Mode Mock (Preview Tanpa Backend)

Default `.env.local` menyetel `NEXT_PUBLIC_USE_MOCK=true` — semua request API dialihkan ke
`src/mocks/` (data contoh domain ekspedisi), jadi frontend bisa di-preview penuh **tanpa backend**:

```bash
npm run dev        # login: isi email & password apa saja
```

- Login bebas (token palsu), dashboard & semua halaman terisi data contoh.
- Tampil badge **MOCK** di header sebagai penanda.
- Mau connect ke backend beneran? Ubah `NEXT_PUBLIC_USE_MOCK=false` di `.env.local` (backend harus jalan).

## Dashboard (Sesuai Desain)

Route `/` menampilkan dashboard keseluruhan:

- **5 KPI cards** — Total AWB Hari Ini, Total Seller Aktif, Armada Aktif (x/y),
  Implant Aktif (x/y), Total Manpower.
- **Indonesia Transit Hubs** — peta stilir sebaran gudang & rute armada.
- **Efektivitas Manpower** & **Efektivitas Pop Karung** — tabel + progress bar warna.
- **Status Pengiriman** — ID Kendaraan, Driver, Asal, Tujuan, Status
  (IN TRANSIT / LOADING / WEATHER DELAY / DELIVERED).
- **Top 5 Gudang Terproduktif** — ranking dengan progress bar.

Data diambil via `GET /dashboard/summary` dengan **polling 30 detik**
(`src/hooks/use-dashboard.ts`, siap di-upgrade ke WebSocket).

## Pola Penting

- **API client terpusat** (`src/lib/api-client.ts`) — inject `Authorization: Bearer`, `Accept: application/json`, auto-unwrap `{ success, data }`, lempar `ApiError`. Saat mock aktif, request dialihkan ke `src/mocks/handlers.ts`.
- **Auth** — token Sanctum disimpan di localStorage via Zustand persist. Guard: client-side di `(dashboard)/layout.tsx` (redirect ke `/login` kalau belum ada token).
- **Role-based menu** — menu sidebar disaring dari `ROLE_MENU` di `src/lib/constants.ts` (admin/supervisor/driver/vendor/finance).
- **Realtime** — Dashboard pakai `refetchInterval` (30s). Saat backend siap WebSocket, tinggal ganti sumber query.

## Roadmap Frontend

- [ ] Modul Gudang, Absensi, Laporan (menunggu endpoint & spesifikasi backend)
- [ ] CRUD form lengkap (create/update) per modul
- [ ] Pagination & debounce search (backend belum paged)
- [ ] WebSocket realtime (pengganti polling)
- [ ] Dark mode toggle
- [ ] Mobile responsiveness penuh
