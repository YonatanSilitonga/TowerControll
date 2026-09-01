# Plan: Konversi Jadwal Ritase dari Hardcoded ke Dinamis (Database)

## Status: 📋 PLAN

---

## Masalah Saat Ini

### 1. Semua Jadwal Ritase Hardcoded di Go Code

Untuk ubah jam, tambah driver, atau ganti rute — harus **edit code + redeploy backend**.

| Komponen | Lokasi | Isi | Jumlah |
|:---------|:-------|:----|:-------|
| **jadwalRitaseMap** | `admin_ritase_handlers.go:46-58` | Jam mulai/selesai per jenis + ritase_ke | 7 entry |
| **tentukanJenisRitase** | `admin_ritase_handlers.go:188-201` | Mapping driver → jenis (outgoing/incoming) | 2 aturan (D10, D11) |
| **defaultFixedRoutes** | `admin_ritase_handlers.go:72-164` | Template rute lengkap (driver, kendaraan, stops) | 11 rute |
| **ambilJadwal** | `admin_ritase_handlers.go:62-69` | Lookup dari Go map | — |

### 2. Frontend Gak Tampilkan Jenis Ritase

Backend sudah kirim `jenis_ritase` di JSON, tapi **frontend type `AdminRitaseItem` gak punya field itu**:

```typescript
// src/types/armada.ts:85-106
export interface AdminRitaseItem {
  // ... field lain
  ritase_ke: number;
  status: string;
  // ❌ GAK ADA jenis_ritase di sini!
}
```

Jadi user **gak tau mana incoming mana outgoing** di UI.

### 3. Filter Hanya per Ritase Ke

Filter yang ada sekarang (`Semua Ritase`, `R1`, `R2`, `R3`, `R4`) — **gak ada filter incoming/outgoing**.

---

## Solusi Backend: 3 Tabel Database Baru

### Tabel 1: `jadwal_ritase_config` (ganti `jadwalRitaseMap`)

```sql
CREATE TABLE jadwal_ritase_config (
  id          SERIAL PRIMARY KEY,
  jenis       VARCHAR(20) NOT NULL,   -- 'outgoing' | 'incoming'
  ritase_ke   INTEGER NOT NULL,
  jam_mulai   TIME NOT NULL,
  jam_selesai TIME NOT NULL,
  UNIQUE(jenis, ritase_ke)
);
```

**Data seed:**

| jenis | ritase_ke | jam_mulai | jam_selesai |
|:------|:----------|:----------|:------------|
| outgoing | 1 | 16:00:00 | 20:00:00 |
| outgoing | 2 | 20:01:00 | 00:00:00 |
| outgoing | 3 | 00:01:00 | 03:00:00 |
| incoming | 1 | 01:00:00 | 04:30:00 |
| incoming | 2 | 07:00:00 | 10:30:00 |
| incoming | 3 | 13:00:00 | 16:30:00 |
| incoming | 4 | 19:00:00 | 22:30:00 |

---

### Tabel 2: `driver_ritase_jenis` (ganti `tentukanJenisRitase`)

```sql
CREATE TABLE driver_ritase_jenis (
  id          SERIAL PRIMARY KEY,
  id_driver   INTEGER NOT NULL REFERENCES driver(id_driver),
  ritase_ke   INTEGER NOT NULL,
  jenis       VARCHAR(20) NOT NULL,   -- 'outgoing' | 'incoming'
  UNIQUE(id_driver, ritase_ke)
);
```

**Data seed:**

| id_driver | ritase_ke | jenis |
|:----------|:----------|:------|
| 10 (Gery) | 1 | incoming |
| 10 (Gery) | 4 | incoming |
| 11 (Udin) | 2 | incoming |
| 11 (Udin) | 3 | incoming |

**Default:** Kalau driver + ritase_ke tidak ada di tabel ini → `outgoing`.

**Konsep DINAMIS:**
- Driver **gak dikunci** ke satu jenis
- Satu driver bisa handle incoming di ritase ke-1, outgoing di ritase ke-2
- Tergantung ditugaskan ke ritase_ke berapa
- Contoh: Driver Taras bisa outgoing di R1, tapi incoming di R2

---

### Tabel 3: `ritase_route_template` + `ritase_stop_template` (ganti `defaultFixedRoutes`)

```sql
CREATE TABLE ritase_route_template (
  id              SERIAL PRIMARY KEY,
  id_driver       INTEGER NOT NULL REFERENCES driver(id_driver),
  id_kendaraan    INTEGER NOT NULL REFERENCES kendaraan(id_kendaraan),
  id_drop_point   INTEGER NOT NULL REFERENCES drop_point(id_drop_point),
  ritase_ke       INTEGER NOT NULL,
  jenis_ritase    VARCHAR(20),
  aktif           BOOLEAN DEFAULT TRUE,
  urutan_template INTEGER DEFAULT 0
);

CREATE TABLE ritase_stop_template (
  id                SERIAL PRIMARY KEY,
  id_route_template INTEGER NOT NULL REFERENCES ritase_route_template(id) ON DELETE CASCADE,
  urutan            INTEGER NOT NULL,
  jenis_stop        VARCHAR(20) NOT NULL,
  id_lokasi         INTEGER NOT NULL,
  kolom_lokasi      VARCHAR(30) NOT NULL,
  keterangan        TEXT
);
```

**Data seed:** 11 rute dari `defaultFixedRoutes` + semua stops-nya.

---

## Frontend: UI Incoming vs Outgoing

### A. Badge Jenis Ritase di Card

Di setiap ritase card, tambah **badge incoming/outgoing**:

```
┌──────────────────────────────────────────────┐
│ [Ritase ke-2] [Outgoing] [StatusBadge]       │ ← badge warna berbeda
│                                              │
│ 👤 Gery                                      │
│ 🚛 B 1234 AB                                 │
│ ⏰ 20:01 – 00:00                             │
│ ...                                          │
└──────────────────────────────────────────────┘
```

**Warna badge:**
- **Outgoing** → `bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300` (biru)
- **Incoming** → `bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300` (oranye)

**Ikon:**
- Outgoing → `ArrowUp` (↑ keluar gudang)
- Incoming → `ArrowDown` (↓ masuk gudang)

### B. Filter Incoming/Outgoing

Tambah filter button di bar filter:

```
[Semua Ritase] [R1] [R2] [R3] [R4] │ [Semua Jenis] [🔵 Outgoing] [🟠 Incoming]
```

### C. KPI Cards — Tambah Breakdown

```
[Total Ritase] [Driver Ditugaskan] [Dalam Perjalanan] [Selesai]
                        │
        Tambah baris: [Outgoing: X] [Incoming: Y]
```

---

## Frontend: UI Config di Halaman Jadwal Ritase (Tower Control)

### Lokasi UI

Config jadwal ritase **bukan di panel Admin**, tapi di **halaman Jadwal Ritase** yang sudah ada di module Tower Control.

**Path:** `/jadwal` → Tab **"Pengaturan ⚙️"**

### Tampilan Halaman Jadwal Ritase (Sesudah)

```
┌─────────────────────────────────────────────────────────────┐
│  Jadwal Ritase                                              │
│                                                             │
│  [📋 Jadwal Hari Ini]  [🔄 Generate]  [⚙️ Pengaturan]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Tab 1: **Jadwal Hari Ini** (yang sudah ada + badge incoming/outgoing + filter)
Tab 2: **Generate** (yang sudah ada sekarang)
Tab 3: **Pengaturan ⚙️** (BARU — CRUD config)

---

### Detail Tab "Pengaturan ⚙️"

#### Sub-Tab 1: Jam Ritase

Tabel editable untuk jam mulai/selesai per jenis + ritase_ke.

```
┌─────────────────────────────────────────────────────────────┐
│  Jam Ritase                                                 │
│                                                             │
│  Jenis        Ritase Ke    Jam Mulai    Jam Selesai  Aksi   │
│  ─────────────────────────────────────────────────────────  │
│  🔵 Outgoing  R1           16:00        20:00        ✏️ 🗑️  │
│  🔵 Outgoing  R2           20:01        00:00        ✏️ 🗑️  │
│  🔵 Outgoing  R3           00:01        03:00        ✏️ 🗑️  │
│  🟠 Incoming  R1           01:00        04:30        ✏️ 🗑️  │
│  🟠 Incoming  R2           07:00        10:30        ✏️ 🗑️  │
│  🟠 Incoming  R3           13:00        16:30        ✏️ 🗑️  │
│  🟠 Incoming  R4           19:00        22:30        ✏️ 🗑️  │
│                                                             │
│  [+ Tambah Jam Ritase]                                      │
└─────────────────────────────────────────────────────────────┘
```

**Aksi:**
- **Edit (✏️):** Klik baris → modal edit → ubah jam_mulai/jam_selesai → simpan
- **Hapus (🗑️):** Konfirmasi → hapus dari DB
- **Tambah (+):** Pilih jenis (outgoing/incoming), ritase_ke, jam mulai, jam selesai

---

#### Sub-Tab 2: Driver → Jenis (DINAMIS)

Tabel mapping driver mana yang handle incoming/outgoing per ritase_ke.

**Konsep:** Driver **bisa keduanya** — incoming DAN outgoing, tergantung ritase_ke.

```
┌─────────────────────────────────────────────────────────────┐
│  Driver → Jenis Ritase                                      │
│                                                             │
│  Driver         Ritase Ke    Jenis       Aksi               │
│  ─────────────────────────────────────────────────────────  │
│  🟠 Gery (D10)  R1           Incoming    ✏️ 🗑️              │
│  🟠 Gery (D10)  R4           Incoming    ✏️ 🗑️              │
│  🟠 Udin (D11)  R2           Incoming    ✏️ 🗑️              │
│  🟠 Udin (D11)  R3           Incoming    ✏️ 🗑️              │
│                                                             │
│  [+ Tambah Mapping]                                         │
│                                                             │
│  ℹ️ Driver yang tidak ada di tabel ini otomatis = Outgoing  │
│  ℹ️ Satu driver bisa incoming di ritase tertentu, outgoing  │
│     di ritase lain — dinamis per ritase_ke.                 │
└─────────────────────────────────────────────────────────────┘
```

**Aksi:**
- **Tambah (+):** Pilih Driver → Ritase Ke → Jenis (Outgoing/Incoming)
- **Edit (✏️):** Ganti jenis
- **Hapus (🗑️):** Driver kembali ke default (outgoing)

**Contoh Dinamis:**

| Driver | Ritase Ke | Jenis | Keterangan |
|:-------|:----------|:------|:-----------|
| Taras | R1 | Outgoing | Kirim barang keluar |
| Taras | R2 | Incoming | Ambil barang masuk |
| Gery | R1 | Incoming | Khusus ambil barang |
| Gery | R2 | Outgoing | Default (gak ada di tabel) |

---

#### Sub-Tab 3: Template Rute

Tabel daftar rute yang dipakai saat Generate.

```
┌─────────────────────────────────────────────────────────────┐
│  Template Rute                                              │
│                                                             │
│  Driver    Kendaraan   Gateway   Ritase   Jenis    Status   │
│  ─────────────────────────────────────────────────────────  │
│  D3        B 1234 AB   GW2       R1       🔵 Outgoing ✅   │
│  D3        B 1234 AB   GW2       R2       🔵 Outgoing ✅   │
│  D2        B 5678 CD   GW2       R1       🔵 Outgoing ✅   │
│  ...dst                                                     │
│  D11       B 9999 EF   GW3       R2       🟠 Incoming ✅   │
│  D10       B 9999 EF   GW3       R1       🟠 Incoming ✅   │
│                                                             │
│  [+ Tambah Rute]                                            │
└─────────────────────────────────────────────────────────────┘
```

Klik baris → buka detail rute → edit stops:

```
┌─────────────────────────────────────────────────────────────┐
│  Edit Rute: D3 → Outgoing R1                               │
│                                                             │
│  Driver: [D3 ▼]  Kendaraan: [B 1234 AB ▼]                  │
│  Gateway: [GW2 ▼]  Ritase Ke: [R1 ▼]                       │
│                                                             │
│  Stops:                                                     │
│  1. [Gudang ▼] Gudang 1        "Mulai dari gudang origin"   │
│  2. [Seller ▼] Seller 3        "Ambil paket di Seller 3"    │
│  3. [Seller ▼] Seller 1        "Ambil paket di Seller 1"    │
│  4. [Gateway ▼] Gateway 2      "Tujuan akhir Gateway 2"     │
│                                                             │
│  [+ Tambah Stop]  [💾 Simpan]  [❌ Batal]                   │
└─────────────────────────────────────────────────────────────┘
```

---

### Siapa yang Bisa Akses Tab "Pengaturan"?

| Role | Akses Pengaturan? | Keterangan |
|:-----|:-------------------|:-----------|
| **Admin** | ✅ Full CRUD | Bisa edit semua config |
| **Direktur** | ✅ Full CRUD | Bisa edit semua config |
| **Tower Control** | ✅ Full CRUD | Bisa edit semua config |
| **Driver** | ❌ Tidak ada akses | Hanya lihat jadwal via mobile |

---

## Code Changes (Backend)

### 1. API Endpoints Baru

```
GET    /api/v1/jadwal-config          → ambil semua config
PUT    /api/v1/jadwal-config/jam      → update jam ritase
POST   /api/v1/jadwal-config/jam      → tambah jam ritase baru
DELETE /api/v1/jadwal-config/jam/:id  → hapus jam ritase
POST   /api/v1/jadwal-config/driver-jenis     → tambah mapping
DELETE /api/v1/jadwal-config/driver-jenis/:id → hapus mapping
GET    /api/v1/jadwal-config/template         → ambil semua template
POST   /api/v1/jadwal-config/template         → tambah template rute
PUT    /api/v1/jadwal-config/template/:id     → update template
DELETE /api/v1/jadwal-config/template/:id     → hapus template
```

**Middleware:** `RequireRoles("admin", "direktur", "tower_control")`

---

### 2. `ambilJadwal()` → Query Database

```go
// Sebelum: baca dari Go map
// Sesudah: query DB
func (h *APIHandler) ambilJadwal(ctx context.Context, jenis string, ritaseKe int) (jamMulai, jamSelesai interface{}) {
    var jm, js string
    err := h.DB.QueryRow(ctx,
        "SELECT jam_mulai::text, jam_selesai::text FROM jadwal_ritase_config WHERE jenis = $1 AND ritase_ke = $2",
        jenis, ritaseKe,
    ).Scan(&jm, &js)
    if err != nil { return nil, nil }
    return jm, js
}
```

**Dampak:** 4 lokasi perlu diupdate (preview, generate, create, update).

---

### 3. `tentukanJenisRitase()` → Query Database

```go
// Sebelum: hardcoded if/else
// Sesudah: query DB, fallback 'outgoing'
func (h *APIHandler) tentukanJenisRitase(ctx context.Context, idDriver int64, ritaseKe int) string {
    var jenis string
    err := h.DB.QueryRow(ctx,
        "SELECT jenis FROM driver_ritase_jenis WHERE id_driver = $1 AND ritase_ke = $2",
        idDriver, ritaseKe,
    ).Scan(&jenis)
    if err != nil { return "outgoing" }
    return jenis
}
```

---

### 4. `defaultFixedRoutes` → Query Database

```go
// Sebelum: routesToUse := defaultFixedRoutes (Go var)
// Sesudah: query DB
routesToUse, err := h.muatRouteTemplate(ctx)
```

---

### 5. Mobile-Side: TIDAK PERLU UBAH

Mobile baca `jam_mulai`/`jam_selesai` dari DB (ritase table), bukan dari Go code.

---

## Frontend: Code Changes

### File yang Perlu Diubah

| File | Perubahan |
|:-----|:----------|
| `src/types/armada.ts` | Tambah `jenis_ritase` ke `AdminRitaseItem` |
| `src/app/(dashboard)/jadwal/page.tsx` | Tambah badge incoming/outgoing di card, filter incoming/outgoing, tab "Pengaturan ⚙️" |
| `src/app/(dashboard)/jadwal/pengaturan/page.tsx` | **File baru** — halaman config dengan 3 sub-tab |
| `src/hooks/use-admin-ritase.ts` | Tambah hooks untuk config CRUD |
| `src/components/ui/jenis-badge.tsx` | **File baru** — komponen badge incoming/outgoing |

### Komponen Baru: `JenisBadge`

```tsx
// src/components/ui/jenis-badge.tsx
// Badge untuk menampilkan Outgoing (biru) / Incoming (oranye)

export function JenisBadge({ jenis }: { jenis: string }) {
  if (jenis === "incoming") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
        <ArrowDown className="h-3 w-3" />
        Incoming
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
      <ArrowUp className="h-3 w-3" />
      Outgoing
    </span>
  );
}
```

### Component Breakdown

```
jadwal/page.tsx
├── Tabs: [Jadwal Hari Ini] [Generate] [Pengaturan ⚙️]
│
├── Tab "Jadwal Hari Ini"
│   ├── KPI Cards (tambah: Outgoing X, Incoming Y)
│   ├── Filter Bar: [Ritase] + [Jenis: Semua/Outgoing/Incoming]
│   └── Ritase Cards
│       ├── JenisBadge (Outgoing/Incoming)
│       ├── StatusBadge
│       └── Detail (driver, kendaraan, jam, stops)
│
├── Tab "Generate" → (yang sudah ada)
│
└── Tab "Pengaturan ⚙️" → (BARU)
    ├── SubTab: Jam Ritase
    │   ├── DataTable (jenis badge + jam)
    │   ├── EditModal (ubah jam)
    │   └── DeleteButton (konfirmasi)
    │
    ├── SubTab: Driver → Jenis
    │   ├── DataTable (driver + ritase_ke + jenis badge)
    │   ├── AddModal (pilih driver + ritase_ke + jenis)
    │   └── DeleteButton (konfirmasi)
    │
    └── SubTab: Template Rute
        ├── DataTable (driver + kendaraan + gateway + jenis badge)
        ├── AddModal (pilih driver + kendaraan + gateway + ritase_ke)
        ├── EditPage (edit stops detail)
        └── DeleteButton (konfirmasi)
```

---

## Alur Lengkap Sesudah Dinamis

```
┌─────────────────────────────────────────────────────────┐
│  ADMIN / TOWER CONTROL / DIREKTUR                       │
│  Buka halaman Jadwal Ritase → Tab "Pengaturan ⚙️"      │
│                                                         │
│  1. Edit jam ritase di tabel                            │
│     → PUT /api/v1/jadwal-config/jam                     │
│     → UPDATE jadwal_ritase_config SET jam_mulai = ...   │
│                                                         │
│  2. Tambah mapping driver → incoming                    │
│     → POST /api/v1/jadwal-config/driver-jenis           │
│     → INSERT INTO driver_ritase_jenis ...               │
│                                                         │
│  3. Tambah template rute untuk Taras                    │
│     → POST /api/v1/jadwal-config/template               │
│     → INSERT INTO ritase_route_template ...             │
└─────────────────────────────────────────────────────────┘
                        │
                        │ Config tersimpan di DB
                        ▼
┌─────────────────────────────────────────────────────────┐
│  ADMIN klik "Generate Ritase"                           │
│                                                         │
│  Backend:                                               │
│  1. Query ritase_route_template WHERE aktif = TRUE      │
│  2. For each route:                                     │
│     a. tentukanJenisRitase() → query driver_ritase_jenis│
│     b. ambilJadwal() → query jadwal_ritase_config       │
│     c. Hitung tanggal (jam < 7 → besok)                 │
│     d. INSERT INTO ritase (jam_mulai, jam_selesai, ...) │
│                                                         │
│  Atau Manual Create:                                    │
│  1. User pilih driver + ritase_ke                       │
│  2. Backend auto: tentukanJenis → ambilJadwal → INSERT  │
└─────────────────────────────────────────────────────────┘
                        │
                        │ jam_mulai, jam_selesai ditulis ke DB
                        ▼
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Tower Control)                               │
│                                                         │
│  1. Query ritase WHERE tanggal = selected_date          │
│  2. Tampilkan card dengan JenisBadge (Outgoing/Incoming)│
│  3. Filter: [Semua] [Outgoing] [Incoming]               │
│  4. KPI: Total + breakdown Outgoing/Incoming            │
└─────────────────────────────────────────────────────────┘
                        │
                        │ User lihat ritase
                        ▼
┌─────────────────────────────────────────────────────────┐
│  MOBILE APP (Driver)                                    │
│                                                         │
│  1. Query ritase WHERE id_driver = me AND tanggal = now │
│  2. hitungWindowMenit(jam_mulai, jam_selesai)           │
│  3. Cocokkan dengan waktu sekarang                       │
│  4. Tampilkan ritase aktif                               │
└─────────────────────────────────────────────────────────┘
```

---

## Urutan Eksekusi

| Phase | Task | Effort | Prioritas |
|:------|:-----|:-------|:----------|
| **1** | Database migration + seed data (3 tabel baru) | 30 min | 🔴 Wajib |
| **2** | Backend: API endpoints untuk config CRUD | 1 jam | 🔴 Wajib |
| **3** | Backend: `ambilJadwal` + `tentukanJenisRitase` + `defaultFixedRoutes` → DB | 1.5 jam | 🔴 Wajib |
| **4** | Frontend: Tambah `jenis_ritase` ke type + `JenisBadge` komponen | 30 min | 🔴 Wajib |
| **5** | Frontend: Filter incoming/outgoing + KPI breakdown | 30 min | 🟡 Recommended |
| **6** | Frontend: Tab "Pengaturan ⚙️" + 3 sub-tab CRUD | 2 jam | 🟡 Recommended |
| **7** | Frontend: Manual create fix (auto-fill jam) | 30 min | 🟡 Recommended |
| **8** | Cleanup: hapus semua hardcoded di Go code | 30 min | 🟢 Terakhir |
| **Total** | | **~7 jam** | |

---

## Risiko & Mitigasi

| Risiko | Mitigasi |
|:-------|:---------|
| Mobile app break | Mobile baca dari DB, selama generate tulis benar → aman |
| Data seed salah | Seed dari hardcoded yang sudah jalan + test generate |
| Performance | Data kecil (7-11 row config), query DB impact minimal |
| Fallback | Kalau DB kosong, bisa tambah fallback ke hardcoded lama |
| User salah edit config | Tambah validasi backend + konfirmasi sebelum save |

---

## Contoh Kasus: Tambah Driver Baru "Taras" (Sesudah Dinamis)

### Sebelum (Hardcoded)
1. Edit Go code: tambah ke `tentukanJenisRitase()`
2. Edit Go code: tambah ke `defaultFixedRoutes()`
3. Redeploy backend
4. Test

### Sesudah (Dinamis)
1. Buka Jadwal Ritase → Tab "Pengaturan ⚙️"
2. Sub-Tab "Driver → Jenis" → [+ Tambah Mapping]
3. Pilih: Driver = Taras, Ritase Ke = 1, Jenis = Outgoing
4. Sub-Tab "Template Rute" → [+ Tambah Rute]
5. Pilih: Driver = Taras, Kendaraan = ..., Gateway = ..., Ritase Ke = 1
6. Atur stops: Gudang → Seller → Gateway
7. Simpan
8. Klik "Generate" → ritase Taras otomatis terbuat

**Waktu: 2 menit vs 30 menit (edit code + deploy)**

---

## Contoh UI: Driver Dinamis (Incoming + Outgoing)

```
Driver Taras ditugaskan:
  R1 → Outgoing (kirim barang keluar gudang)
  R2 → Incoming (ambil barang masuk gudang)

Di UI:
┌─────────────────────────────────────────────────────────────┐
│  Driver → Jenis Ritase                                      │
│                                                             │
│  Driver         Ritase Ke    Jenis       Aksi               │
│  ─────────────────────────────────────────────────────────  │
│  🔵 Taras       R1           Outgoing    ✏️ 🗑️              │
│  🟠 Taras       R2           Incoming    ✏️ 🗑️              │
│  🟠 Gery (D10)  R1           Incoming    ✏️ 🗑️              │
│  🟠 Udin (D11)  R2           Incoming    ✏️ 🗑️              │
│                                                             │
│  [+ Tambah Mapping]                                         │
└─────────────────────────────────────────────────────────────┘

Di Ritase Card:
┌──────────────────────────────────────────────┐
│ [Ritase ke-1] [🔵 Outgoing] [StatusBadge]   │
│ 👤 Taras                                     │
│ 🚛 B 1234 AB                                 │
│ ⏰ 16:00 – 20:00                             │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ [Ritase ke-2] [🟠 Incoming] [StatusBadge]   │
│ 👤 Taras                                     │
│ 🚛 B 1234 AB                                 │
│ ⏰ 20:01 – 00:00                             │
└──────────────────────────────────────────────┘
```
