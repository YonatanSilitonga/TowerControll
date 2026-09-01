# Plan: Perbaikan Jadwal Ritase — Auto-Fill Jam & Jenis Ritase

## Status: 📋 PLAN (Belum Dieksekusi)

---

## Masalah

Saat admin buat jadwal **manual** (form "Buat Jadwal"), **jam_mulai dan jam_selesai kosong (NULL)** di database. Ini terjadi karena:

1. **Frontend tidak mengirim** `jam_mulai`, `jam_selesai`, dan `jenis_ritase` ke backend
2. **Backend tidak memanggil** `tentukanJenisRitase()` di path manual create
3. `ambilJadwal("", ritase_ke)` → lookup gagal karena key kosong → return `nil, nil`

### Kenapa Generate Bisa tapi Manual Create Tidak?

| Path | Jenis Ritase Ditentukan? | Jam Auto-Fill? |
|:-----|:------------------------|:---------------|
| **Generate** | ✅ `tentukanJenisRitase(driver, ke)` | ✅ `ambilJadwal(jenis, ke)` |
| **Manual Create** | ❌ Tidak dipanggil | ❌ `ambilJadwal("", ke)` → NULL |

---

## Alur Bug

```
Frontend Create Form
  ├─ Kirim: tanggal, id_driver, id_kendaraan, id_drop_point, ritase_ke, stops
  ├─ TIDAK kirim: jam_mulai, jam_selesai, jenis_ritase
  └─ POST /ritase
        │
        ▼
Backend AdminCreateRitase
  ├─ req.JamMulai == ""   → skip
  ├─ req.JamSelesai == "" → skip
  ├─ ambilJadwal(req.JenisRitase, req.RitaseKe)
  │   └─ req.JenisRitase == "" (KOSONG!)
  │       └─ jadwalRitaseMap[""] → TIDAK DITEMUKAN → return nil, nil
  ├─ tentukanJenisRitase() TIDAK DIPANGGIL
  └─ INSERT: jam_mulai=NULL, jam_selesai=NULL, jenis_ritase=NULL
```

---

## Rencana Perbaikan

### Fix 1: Backend — Auto-Tentukan Jenis Ritase di AdminCreateRitase

**File:** `D:\Magang\Backend\internal\mobile_api\admin_ritase_handlers.go`
**Lokasi:** Sekitar line 977-984 (fungsi `AdminCreateRitase`)

**Sebelum:**
```go
var jamMulai, jamSelesai interface{}
if req.JamMulai != "" && req.JamSelesai != "" {
    jamMulai = req.JamMulai
    jamSelesai = req.JamSelesai
} else {
    jamMulai, jamSelesai = ambilJadwal(req.JenisRitase, req.RitaseKe)
}
```

**Sesudah:**
```go
var jamMulai, jamSelesai interface{}
if req.JamMulai != "" && req.JamSelesai != "" {
    jamMulai = req.JamMulai
    jamSelesai = req.JamSelesai
} else {
    // Auto-tentukan jenis berdasarkan driver + ritase_ke
    if req.JenisRitase == "" {
        req.JenisRitase = tentukanJenisRitase(req.IDDriver, req.RitaseKe)
    }
    jamMulai, jamSelesai = ambilJadwal(req.JenisRitase, req.RitaseKe)
}
```

**Juga update `jenisVal`** (sekitar line 986-988):
```go
// Sebelum:
var jenisVal interface{}
if req.JenisRitase != "" {
    jenisVal = req.JenisRitase
}

// Sesudah:
var jenisVal interface{}
if req.JenisRitase != "" {
    jenisVal = req.JenisRitase
} else {
    jenisVal = tentukanJenisRitase(req.IDDriver, req.RitaseKe)
}
```

**Efek:** Driver manapun (termasuk Taras ID=26) otomatis dapat jenis_ritase dan jam yang benar saat manual create.

---

### Fix 2: Frontend — Tampilkan Jam Preview di Create Modal

**File:** `D:\Magang\TowerControll\src\app\(dashboard)\jadwal\page.tsx`

#### 2a. Tambah map jam preview (di atas component atau di dalam)

```typescript
// Jadwal preview untuk ditampilkan di form
const JADWAL_PREVIEW: Record<string, Record<number, { mulai: string; selesai: string; label: string }>> = {
  outgoing: {
    1: { mulai: "16:00", selesai: "20:00", label: "Outgoing" },
    2: { mulai: "20:01", selesai: "00:00", label: "Outgoing" },
    3: { mulai: "00:01", selesai: "03:00", label: "Outgoing" },
  },
  incoming: {
    1: { mulai: "01:00", selesai: "04:30", label: "Incoming" },
    2: { mulai: "07:00", selesai: "10:30", label: "Incoming" },
    3: { mulai: "13:00", selesai: "16:30", label: "Incoming" },
    4: { mulai: "19:00", selesai: "22:30", label: "Incoming" },
  },
};

// Helper: tentukan jenis berdasarkan driver (mirror backend logic)
function tentukanJenisLokal(idDriver: number, ritaseKe: number): string {
  if (idDriver === 11 && (ritaseKe === 2 || ritaseKe === 3)) return "incoming";
  if (idDriver === 10 && (ritaseKe === 1 || ritaseKe === 4)) return "incoming";
  return "outgoing";
}
```

#### 2b. Tambah display jam preview di Create Modal

Setelah dropdown "Ritase Ke-", tambah一行显示 jam:

```tsx
{/* Jam Preview (auto dari ritase_ke) */}
{(() => {
  const jenis = tentukanJenisLokal(newRitase.id_driver, newRitase.ritase_ke);
  const jadwal = JADWAL_PREVIEW[jenis]?.[newRitase.ritase_ke];
  if (!jadwal) return null;
  return (
    <div className="rounded-md bg-slate-50 border border-slate-200 p-2.5 text-xs">
      <span className="font-semibold text-slate-700">
        {jadwal.mulai} – {jadwal.selesai}
      </span>
      <span className={`ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
        jenis === "incoming"
          ? "bg-emerald-100 text-emerald-700"
          : "bg-blue-100 text-blue-700"
      }`}>
        {jadwal.label}
      </span>
    </div>
  );
})()}
```

**Efek:** User bisa lihat jam yang akan diisi otomatis sebelum submit. Read-only, gak bisa diubah.

---

### Fix 3: Kirim jenis_ritase dari Frontend (Opsional, tapi bagus)

**File:** `D:\Magang\TowerControll\src\app\(dashboard)\jadwal\page.tsx`

Di `handleSaveCreate`, tambah `jenis_ritase` ke payload:

```typescript
const handleSaveCreate = (e: React.FormEvent) => {
  e.preventDefault();

  // ... validasi existing ...

  const reindexedStops = newRitase.stops.map((s, idx) => ({ ... }));

  // Tentukan jenis_ritase berdasarkan driver + ritase_ke
  const jenisRitase = tentukanJenisLokal(newRitase.id_driver, newRitase.ritase_ke);

  createMutation.mutate(
    {
      tanggal: newRitase.tanggal,
      id_driver: newRitase.id_driver,
      id_kendaraan: newRitase.id_kendaraan,
      id_drop_point: newRitase.id_drop_point,
      ritase_ke: newRitase.ritase_ke,
      jenis_ritase: jenisRitase,  // ← TAMBAH
      stops: reindexedStops,
    },
    { ... }
  );
};
```

---

## Jadwal Ritase (Referensi)

### Outgoing (Barang Keluar dari Gudang) — 3 Ritase

| Ritase Ke | Jam Mulai | Jam Selesai | Keterangan |
|:----------|:----------|:------------|:-----------|
| R1 | 16:00 | 20:00 | Sore → Malam |
| R2 | 20:01 | 00:00 | Malam → Tengah Malam (cross-midnight) |
| R3 | 00:01 | 03:00 | Tengah Malam → Dini Hari |

### Incoming (Barang Masuk ke Gudang) — 4 Ritase

| Ritase Ke | Jam Mulai | Jam Selesai | Keterangan |
|:----------|:----------|:------------|:-----------|
| R1 | 01:00 | 04:30 | Dini Hari |
| R2 | 07:00 | 10:30 | Pagi |
| R3 | 13:00 | 16:30 | Siang |
| R4 | 19:00 | 22:30 | Malam |

### Penentuan Jenis (Driver → Outgoing/Incoming)

| Driver | Ritase Ke | Jenis |
|:-------|:----------|:------|
| D11 (Udin) | 2, 3 | incoming |
| D10 (Gery) | 1, 4 | incoming |
| Semua driver lain | Semua | outgoing |

---

## Urutan Eksekusi

| # | Fix | File | Effort | Prioritas |
|:--|:----|:-----|:-------|:----------|
| 1 | Backend auto-tentukan jenis + jam | `admin_ritase_handlers.go` | 3 min | 🔴 Wajib |
| 2 | Frontend jam preview di create modal | `jadwal/page.tsx` | 10 min | 🟡 Recommended |
| 3 | Frontend kirim jenis_ritase | `jadwal/page.tsx` | 5 min | 🟢 Opsional |

---

## Verifikasi

Setelah fix:
1. Restart backend
2. Buka Jadwal Ritase → klik "Buat Jadwal"
3. Pilih Driver: Taras, Ritase Ke: 1
4. **Harusnya muncul:** "16:00 – 20:00 [OUTGOING]"
5. Submit → cek di database: `jam_mulai` dan `jam_selesai` terisi (bukan NULL)
6. Ulangi untuk Ritase Ke: 2, 3, 4
7. Uji juga dengan driver lain (D1, D2, D3, D10, D11) untuk pastikan gak regression

---

## Catatan

- **Tabel jadwal** (`jadwalRitaseMap`) hardcoded di Go code. Untuk ubah jam, harus edit code + redeploy.
- **`tentukanJenisRitase()`** juga hardcoded. Hanya D10 dan D11 yang punya incoming. Driver lain = outgoing.
- **Cross-midnight handling:** jam_mulai < 07:00 → tanggal = besok.
