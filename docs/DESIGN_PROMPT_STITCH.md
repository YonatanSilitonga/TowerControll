# 🎨 Design Brief + Prompt — Stitch AI / AI UI Designer

**Produk:** Tower Control — Dashboard Monitoring Armada Logistik (Web)
**Project:** Distribution Monitoring System · DC Tangerang · PT Sentral Logistik Bersama
**Stack:** Next.js 14 (App Router) · React Query v5 · Tailwind CSS · Leaflet map · Backend Go · Supabase

---

## 1. Tentang Produk (untuk pemahaman AI)

Web **Tower Control** dipakai tim operasional (role **Direktur & Kapten**) untuk memantau armada secara real-time:

- **Live Tracking**: posisi truk di peta real-time (polling 10 detik), status armada **LIVE / Online·data lama / Offline**, lokasi seller & drop point & gudang, jarak tempuh (OSRM) tiap seller ke Gudang Outgoing & DC.
- **Dashboard operasional**: KPI (total armada, aktif-online, selesai, rata² durasi loading/perjalanan/unloading), peta live + panel armada, durasi proses, bottleneck, alert anomali.
- **Modul Armada**: master data **Kendaraan**, **Driver**, **Seller**, **Ritase** (list + halaman detail per entitas) — tabel tangguh (search, pagination, **kolom bisa di-resize/drag**).
- **Role**: Direktur/Kapten di web; Driver di app mobile terpisah.
- Karakter: dashboard kontrol industri — **padat, data-dense, cepat dibaca, profesional**, bukan marketing site.

---

## 2. Style Guide (token yang sudah dipakai — pertahankan)

| Aspek | Nilai |
|---|---|
| **Warna dasar** | `#034075` (navy brand) — solid, **bukan gradient ungu-biru** |
| **Accent** | Amber `#f59e0b` (mutat/fokus), Emerald `#10b981` (OK/aktif), Sky `#0ea5e9`, Violet `#7c3aed` (DC), Orange `#f97316` (drop point) |
| **Neutral** | Slate (`slate-50/100/200/400/600/800`) |
| **Status** | 🟢 LIVE (emerald) · 🟠 Online·data lama (amber) · 🔴 Offline (rose) |
| **Tipografi** | Font sistem (bukan Inter/Roboto default yang cliché); heading tegas, body kecil data-dense |
| **Radius** | `0.5rem` (rounded-lg) / `1rem` (rounded-2xl) card |
| **Shadow** | **Minimal** — prioritas **border** + radius rapi |
| **Ikon** | **SVG (lucide)**, bukan emoji |
| **Layout** | Bervariasi: grid KPI (2/3/6), map+panel (1fr+340px), card detail, tabel full — jangan "3 kolom semua" |
| **Data** | Tabel resizable, date `dd/mm/yyyy`, durasi format `1j 5m` / `2m 30s`, angka `tabular-nums` |

---

## 3. Halaman / Screen yang didesain

1. **Login** — form kecil, kredensial email/username + password, fitur clean.
2. **Dashboard Operasional**
   - Hero solid navy: judul + tanggal + badge "LIVE · auto-refresh".
   - 6 KPI card compact (Total Armada, Aktif Online, Selesai, Rata² Loading/Perjalanan/Unloading).
   - Kiri: **Peta Live** besar (map + marker truk/seller/gudang/drop). Kanan: **panel Armada Aktif** (list online → offline, klik → detail) + **panel Detail Armada** (status chip, kecepatan, update, app dibuka, riwayat timeline + filter tanggal).
   - Bawah: 3 card info (Durasi Proses, Bottleneck, Alert Anomali).
3. **Live Map** — peta full + panel armada + riwayat kendaraan terpilih; search global (truk/seller/gudang/drop) dengan popup; legenda filter klik; tombol telpon driver/seller.
4. **Armada Overview** — nav cards (Kendaraan/Driver/Seller/Ritase + jumlah) + breakdown status.
5. **Kendaraan** — tabel resizable: Plat, Jenis, Kapasitas, Status, aksi → **detail** (info, riwayat tracking/timeline, daftar ritase, tombol "Lihat di peta").
6. **Driver** — tabel: Nama, Kendaraan (plat + badge Aktif/Lama), Telepon, Jenis, Status → **detail** (info, kendaraan, riwayat, daftar ritase).
7. **Seller** — tabel + **panel detail** (kontak, alamat, No HP, tombol map).
8. **Ritase** — toolbar (search + filter tanggal menyamping), tabel: Kode, Tanggal `dd/mm/yyyy`, Driver, Plat, RIT, status → **detail ritase** (Informasi, Statistik Ritase, Rute stepper, Muatan, Timeline).

### Elemen/komponen yang ada
Sidebar (nav role-based) + Header (avatar, logout) + Mobile drawer (hamburger) · Breadcrumb · Tabs Armada · InfoTip (hover) · DataTable (search, pagination, **kolom drag-resize**, mobile jadi kartu) · StatusBadge · DriverSummary & StatusTimeline · Legenda map filter · Chip status.

---

## 4. Perilaku / UX yang dipertahankan

- **Real-time**: polling 10s map, 30s KPI; badge LIVE pulsing.
- **Status 3 model**: LIVE / Online·data lama / Offline; speed disembunyikan saat offline.
- **Navigasi cepat**: top progress bar + loading skeleton saat pindah halaman.
- **Click behavior**: baris armada → peta/detail; tombol aksi Detail/Map/Telepon; `stopPropagation` di tombol dalam row.
- **Mobile**: touch target ≥ 44px, tabel → kartu, drawer nav.
- **Accessible & consistent** antar halaman armada.

---

## 5. DO / DON'T (anti "bau AI")

**DON'T:** gradient ungu-biru · Inter/Roboto default · emoji sebagai ikon · semua section 3-kolom · semua center · CTA generik ("Learn More") · shadow berlebihan · animasi tanpa fungsi.
**DO:** 1 warna dasar + accent · layout bervariasi · ikon SVG · copy spesifik & kontekstual (track/trace/hitung) · maks 2 CTA/section · touch ≥44px · border+border-radius rapi · hierarki visual jelas · data-dense & profesional.

---

## 6. 📋 PROMPT SIAP PASTE (ke Stitch AI)

```text
Design a complete, production-quality dashboard web app called "Tower Control" — 
a logistics fleet-monitoring control center for a distribution company (roles: Direktur & Kapten).

TONE & AUDIENCE
Industrial, data-dense, professional control panel. Not a marketing site. Operators need to read 
real-time status at a glance. Show state clearly, minimal decoration, fast readability.

STYLE SYSTEM
- Base color: deep navy #034075 (SOLID, no purple-blue gradients). Accents: amber, emerald, sky, violet, orange.
- Typography: system font stack; strong hierarchy; compact body text for data.
- Cards: rounded (8–16px), thin borders, minimal shadows. Icons: thin-stroke SVG line icons (like Lucide), never emoji.
- Status language: LIVE (green dot/pulse), "Online · data lama" (amber), Offline (red badge).
- Layout variety: KPI strip (2/3/6 col), left map + right 340px side panels, full-width tables, detail cards. 
  Do not repeat 3-column everywhere; left-align content; max 2 CTAs per section.
- Tables: dense, sortable-looking headers, resizable column widths, search + pagination, mobile collapses to cards.
- Dates dd/mm/yyyy; durations like "1h 5m" / "2m 30s"; tabular numbers.

SCREENS (deliver all)
1) Login page.
2) Dashboard: navy hero bar (title, date, LIVE badge) → 6 KPI cards → map (left, large) + right panel 
   "Armada Aktif" list (online first, then offline section) → selected-vehicle detail panel 
   (status chip, speed, last update, app-opened time, history timeline + date filter) → bottom row: 
   "Durasi Proses" mini bars, "Bottleneck", "Alert Anomali".
3) Live Map page: full map, global search (trucks/sellers/warehouses/drop points) with popup, 
   clickable legend filter, fleet list + vehicle timeline.
4) Armada tabs: Overview (nav cards + status breakdown), Kendaraan (list + detail), Driver 
   (list + detail with current vehicle & history + assigned trips), Seller (list + side detail panel), 
   Ritase (list with search+date toolbar, detail page with route stepper, stats, timeline, loading sites).
5) Show breadcrumbs, top progress loading bar, skeleton states, empty states, mobile collapse (cards + drawer nav).

UX BEHAVIORS
- Real-time feel: pulsing LIVE indicator, auto-refresh badges.
- Row click → detail/map; per-row actions (Detail, Map, Call) that do NOT trigger row navigation.
- Loading: top progress bar + skeleton on route change; keep content visible during polling.
- Mobile: touch targets ≥ 44px; hamburger drawer; tables become stacked cards.

DELIVER
- High-fidelity UI for every screen above, consistent token system (color/font/spacing/components),
  light theme preferred (or light+dark), components: sidebar, header, breadcrumb, tabs, DataTable 
  (resizable), status badges, timeline, map panel, KPI cards, detail panels.
- Follow this anti-generic-AI rule list: no purple-blue gradients, no Inter/Roboto-only default, 
  no emoji icons, no repeated 3-column sections, no generic CTAs, minimal shadows, specific copy 
  (track, trace, calculate, compare).
```

---

## 7. Cara Pakai

1. Salin bagian **"6. PROMPT SIAP PASTE"** ke Stitch AI (atau Figma AI / v0 / Copilot Designer dll).
2. Kalau Stitch minta aktifasi/style → arahkan ke **Section 2 (Style Guide)** & **Section 5 (DO/DON'T)**.
3. Hasil akhir → sesuaikan implementasi ke token yang ada (warna/komponen) biar gak patah sama kode.

> Catatan: dokumen ini versi **committable** — simpan di `docs/` biar tim (web/mobile) bisa pakai sebagai acuan desain yang sama.