"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  History,
  Inbox,
  RefreshCw,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { UnderConstruction } from "@/components/under-construction";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/stores/auth-store";
import { swal } from "@/lib/swal";
import { cn } from "@/lib/utils";
import {
  useConfirmGudangPickup,
  useGudangKonfirmasi,
  useGudangPending,
  useGudangRitase,
  useInputGudangMuatan,
  type GudangPendingGroup,
  type GudangRitaseCandidate,
  type GudangRiwayatItem,
  type GudangSisaGroup,
} from "@/hooks/use-gudang-muatan";

const toInt = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
};

const candidateOptionLabel = (r: GudangRitaseCandidate) => {
  const driver = r.nama_driver?.trim() || "-";
  const plat = r.plat_nomor?.trim();
  const platLabel = plat && plat !== "-" ? plat : "-";
  const stop = r.urutan > 0 ? r.urutan : "-";
  return `Driver: ${driver}, Plat: ${platLabel}, Titik Stop: ${stop}`;
};

const waktuFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
});

const formatWaktu = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : waktuFormatter.format(date);
};

function NumField({
  label,
  value,
  onChange,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-semibold text-slate-500">{label}</Label>
      <Input
        type="number"
        min={min}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Math.max(min, toInt(e.target.value)))}
        className="h-10 text-sm tabular-nums"
      />
    </div>
  );
}

function TrioFields({
  title,
  values,
  onChange,
}: {
  title: string;
  values: { jkt: number; seg: number; btn: number };
  onChange: (v: { jkt: number; seg: number; btn: number }) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-bold text-slate-700">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {(["jkt", "seg", "btn"] as const).map((k) => (
          <NumField
            key={k}
            label={k.toUpperCase()}
            value={values[k]}
            onChange={(v) => onChange({ ...values, [k]: v })}
          />
        ))}
      </div>
    </div>
  );
}

const chipTone = {
  violet: "border-violet-100 bg-violet-50 text-violet-700",
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  rose: "border-rose-100 bg-rose-50 text-rose-700",
} as const;

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof chipTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold",
        chipTone[tone]
      )}
    >
      <span className="opacity-75">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </span>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  description,
  right,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0c1e3a]/5 text-[#0c1e3a]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

const emptyTrio = { jkt: 0, seg: 0, btn: 0 };

export default function GudangPage() {
  const role = useAuthStore((s) => s.user?.role);

  if (role !== "koor_gudang") {
    return (
      <div>
        <PageHeader
          title="Gudang"
          description="Kelola stok, inbound/outbound, dan produktivitas gudang."
          crumbs={[{ label: "Gudang" }]}
        />
        <UnderConstruction />
      </div>
    );
  }

  return <GudangInputPanel />;
}

function GudangInputPanel() {
  const pendingQ = useGudangPending();
  const konfirmasiQ = useGudangKonfirmasi();
  const ritaseQ = useGudangRitase();
  const inputMut = useInputGudangMuatan();

  const [ritKe, setRitKe] = useState(1);
  const [koli, setKoli] = useState({ ...emptyTrio });
  const [ecer, setEcer] = useState({ ...emptyTrio });
  const [hvKoli, setHvKoli] = useState(0);
  const [hvEcer, setHvEcer] = useState(0);
  const [catatan, setCatatan] = useState("");

  const pending = useMemo(
    () => (Array.isArray(pendingQ.data) ? pendingQ.data : []),
    [pendingQ.data]
  );
  const sisaGrup = useMemo(
    () => konfirmasiQ.data?.sisa_grup ?? [],
    [konfirmasiQ.data]
  );
  const riwayat = useMemo(() => konfirmasiQ.data?.riwayat ?? [], [konfirmasiQ.data]);
  const ritases = useMemo(
    () => (Array.isArray(ritaseQ.data) ? ritaseQ.data : []),
    [ritaseQ.data]
  );

  const groups = useMemo(() => {
    const seen = new Set<string>();
    const out: {
      key: string;
      jenis: string;
      ritKe: number;
      pending?: GudangPendingGroup;
      sisa?: GudangSisaGroup;
    }[] = [];
    const add = (jenis: string, rit: number) => {
      const key = `${jenis}__${rit}`;
      if (!key || seen.has(key)) return;
      const p = pending.find((x) => `${x.jenis_ritase}__${x.ritase_ke}` === key);
      const s = sisaGrup.find((x) => `${x.jenis_ritase}__${x.ritase_ke}` === key);
      const adaSisa =
        s != null && (s.sisa_koli > 0 || s.sisa_ecer > 0);
      if (!p && !adaSisa) return;
      seen.add(key);
      out.push({ key, jenis, ritKe: rit, pending: p, sisa: s });
    };
    for (const p of pending) add(String(p.jenis_ritase ?? ""), toInt(p.ritase_ke));
    for (const s of sisaGrup) add(String(s.jenis_ritase ?? ""), toInt(s.ritase_ke));
    out.sort((a, b) => a.ritKe - b.ritKe || a.jenis.localeCompare(b.jenis));
    return out;
  }, [pending, sisaGrup]);

  const totalKoliInput = koli.jkt + koli.seg + koli.btn;
  const totalInput =
    totalKoliInput +
    ecer.jkt +
    ecer.seg +
    ecer.btn +
    hvKoli +
    hvEcer;

  const isLoading = konfirmasiQ.isLoading || pendingQ.isLoading || ritaseQ.isLoading;
  const hasError = konfirmasiQ.isError || pendingQ.isError || ritaseQ.isError;

  const reload = () => {
    void pendingQ.refetch();
    void konfirmasiQ.refetch();
    void ritaseQ.refetch();
  };

  const handleSubmit = async () => {
    if (totalInput <= 0) {
      swal.error("Isi minimal salah satu angka muatan (Koli/Ecer/HV).");
      return;
    }
    const ok = await swal.confirm(
      "Simpan muatan?",
      `Rit ${ritKe} Outgoing — ${totalKoliInput} koli akan dicatat untuk Gudang Outgoing.`,
      "Ya, simpan"
    );
    if (!ok) return;
    try {
      await inputMut.mutateAsync({
        jenis_ritase: "outgoing",
        ritase_ke: ritKe,
        catatan: catatan.trim() || undefined,
        koli_jkt: koli.jkt,
        koli_seg: koli.seg,
        koli_btn: koli.btn,
        ecer_jkt: ecer.jkt,
        ecer_seg: ecer.seg,
        ecer_btn: ecer.btn,
        koli_hv: hvKoli,
        ecer_hv: hvEcer,
      });
      swal.success("Data muatan berhasil disimpan!");
      setKoli({ ...emptyTrio });
      setEcer({ ...emptyTrio });
      setHvKoli(0);
      setHvEcer(0);
      setCatatan("");
    } catch (e: any) {
      swal.error(e?.message ?? "Gagal menyimpan data muatan.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <PageHeader
        title="Gudang"
        description="Catat muatan outgoing dan konfirmasi pengambilan driver dalam satu layar."
        crumbs={[{ label: "Gudang" }]}
      />

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(340px,410px)_minmax(0,1fr)]">
        <Card className="min-w-0 overflow-hidden rounded-xl border-slate-200 shadow-sm xl:sticky xl:top-16">
          <div className="h-1 bg-gradient-to-r from-[#0c1e3a] via-blue-600 to-sky-400" />
          <CardHeader className="pb-3">
            <PanelHeader
              icon={Warehouse}
              title="Input Muatan Outgoing"
              description="Catat barang masuk ke Gudang Outgoing. Data langsung tampil di peta setelah disimpan."
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="w-full space-y-1.5 sm:w-36">
                <Label className="text-[11px] font-semibold text-slate-500">Ritase</Label>
                <Select value={String(ritKe)} onValueChange={(v) => setRitKe(toInt(v))}>
                  <SelectTrigger
                    aria-label="Pilih ritase"
                    className="h-10 bg-white font-semibold"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3].map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        Rit {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Total input
                </p>
                <p className="mt-0.5 text-lg font-bold leading-none tabular-nums text-[#0c1e3a]">
                  {totalInput}
                </p>
              </div>
            </div>

            <TrioFields title="Koli" values={koli} onChange={setKoli} />
            <TrioFields title="Ecer" values={ecer} onChange={setEcer} />

            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-xs font-bold text-slate-700">High Value</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <NumField label="Koli HV" value={hvKoli} onChange={setHvKoli} />
                <NumField label="Ecer HV" value={hvEcer} onChange={setHvEcer} />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-500">
                Catatan (opsional)
              </Label>
              <Input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="cth. kiriman pagi"
                className="h-10 text-sm"
              />
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={inputMut.isPending}
              className="h-10 w-full bg-[#0c1e3a] font-semibold text-white hover:bg-[#16335a]"
            >
              {inputMut.isPending ? "Menyimpan..." : "Simpan Muatan"}
            </Button>
          </CardContent>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card className="min-w-0 rounded-xl border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <PanelHeader
                icon={Truck}
                title="Konfirmasi Pengambilan"
                description="Pilih driver yang datang, isi jumlah yang diambil, lalu konfirmasi agar muatan berpindah ke mobil driver."
                right={
                  !isLoading && !hasError && groups.length > 0 ? (
                    <Badge
                      variant="outline"
                      className="rounded-md border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600"
                    >
                      {groups.length} grup
                    </Badge>
                  ) : undefined
                }
              />
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <GroupSkeleton />
              ) : hasError ? (
                <ErrorState onRetry={reload} />
              ) : groups.length === 0 ? (
                <EmptyState />
              ) : (
                groups.map((g) => (
                  <GroupCard
                    key={g.key}
                    groupKey={g.key}
                    jenis={g.jenis}
                    ritKe={g.ritKe}
                    pending={g.pending}
                    sisa={g.sisa}
                    ritases={ritases}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {riwayat.length > 0 && <HistoryCard items={riwayat} />}
        </div>
      </div>
    </div>
  );
}

function GroupSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((item) => (
        <div key={item} className="rounded-xl border border-slate-200 p-4">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="mt-4 h-10 w-full" />
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-rose-100 bg-rose-50/60 px-6 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <AlertCircle className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-800">Gagal memuat data konfirmasi</p>
      <p className="mt-1 text-xs text-slate-500">Periksa koneksi lalu coba lagi.</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="mt-3 border-rose-200 bg-white text-rose-700 hover:bg-rose-50 hover:text-rose-800"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Coba Lagi
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
        <Inbox className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700">Belum ada antrean konfirmasi</p>
      <p className="mt-1 text-xs text-slate-400">
        Input muatan hari ini akan muncul di sini untuk dikonfirmasi.
      </p>
    </div>
  );
}

function HistoryCard({ items }: { items: GudangRiwayatItem[] }) {
  return (
    <Card className="min-w-0 rounded-xl border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <PanelHeader
          icon={History}
          title="Pengambilan Hari Ini"
          description={`${items.length} transaksi sudah dikonfirmasi.`}
        />
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-100 px-3 py-2.5 text-xs transition-colors hover:bg-slate-50"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
            <span className="font-bold text-[#0c1e3a]">Rit {r.ritase_ke}</span>
            <span className="font-semibold text-slate-800">
              {r.nama_driver || "Driver"}
            </span>
            <span className="text-slate-400">{r.kode_ritase}</span>
            <span className="ml-auto tabular-nums text-slate-500">
              {formatWaktu(r.created_at)}
            </span>
            <div className="flex w-full items-center gap-3 border-t border-slate-100 pt-1.5 sm:w-auto sm:border-0 sm:pt-0">
              <span className="tabular-nums font-bold text-violet-700">{r.total_koli} koli</span>
              <span className="tabular-nums text-slate-500">{r.total_ecer} ecer</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function GroupCard({
  groupKey,
  jenis,
  ritKe,
  pending,
  sisa,
  ritases,
}: {
  groupKey: string;
  jenis: string;
  ritKe: number;
  pending?: GudangPendingGroup;
  sisa?: GudangSisaGroup;
  ritases: GudangRitaseCandidate[];
}) {
  const confirmMut = useConfirmGudangPickup();

  const candidates = useMemo(() => {
    const seen = new Set<number>();
    return ritases.filter((r) => {
      if (toInt(r.ritase_ke) !== ritKe) return false;
      const rJenis = String(r.jenis_ritase ?? "");
      if (jenis && rJenis && rJenis !== jenis) return false;
      if (seen.has(r.id_ritase)) return false;
      seen.add(r.id_ritase);
      return true;
    });
  }, [ritases, ritKe, jenis]);

  const [selectedRitase, setSelectedRitase] = useState<number>(0);
  const [catatan, setCatatan] = useState("");

  const [tKoli, setTKoli] = useState({ ...emptyTrio });
  const [tEcer, setTEcer] = useState({ ...emptyTrio });
  const [tHvKoli, setTHvKoli] = useState(0);
  const [tHvEcer, setTHvEcer] = useState(0);

  useEffect(() => {
    setTKoli({
      jkt: sisa?.sisa_koli_jkt ?? 0,
      seg: sisa?.sisa_koli_seg ?? 0,
      btn: sisa?.sisa_koli_btn ?? 0,
    });
    setTEcer({
      jkt: sisa?.sisa_ecer_jkt ?? 0,
      seg: sisa?.sisa_ecer_seg ?? 0,
      btn: sisa?.sisa_ecer_btn ?? 0,
    });
  }, [groupKey, sisa]);

  useEffect(() => {
    setSelectedRitase(candidates.length > 0 ? candidates[0].id_ritase : 0);
  }, [groupKey, candidates]);

  const count = pending ? toInt(pending.jumlah_input) : 0;
  const confirmTotal =
    tKoli.jkt +
    tKoli.seg +
    tKoli.btn +
    tEcer.jkt +
    tEcer.seg +
    tEcer.btn +
    tHvKoli +
    tHvEcer;
  const isStartOnly = candidates.length === 0 && ritKe === 1;

  const handleConfirm = async () => {
    if (!selectedRitase) {
      swal.error("Pilih driver/ritase pengambil terlebih dahulu.");
      return;
    }
    const selected = candidates.find((r) => r.id_ritase === selectedRitase);
    if (!selected) {
      swal.error("Data ritase pengambil tidak ditemukan.");
      return;
    }
    if (confirmTotal <= 0) {
      swal.error("Isi minimal salah satu jumlah yang diambil.");
      return;
    }
    const ok = await swal.confirm(
      "Konfirmasi pengambilan?",
      `${confirmTotal} item akan dipindahkan ke ${selected.nama_driver || "driver"} (${selected.plat_nomor || "-"}).`,
      "Ya, konfirmasi"
    );
    if (!ok) return;
    try {
      const res = await confirmMut.mutateAsync({
        jenis_ritase: jenis || "outgoing",
        ritase_ke: ritKe,
        id_ritase: selected.id_ritase,
        id_stop: selected.id_stop ?? 0,
        diambil_koli_jkt: tKoli.jkt,
        diambil_koli_seg: tKoli.seg,
        diambil_koli_btn: tKoli.btn,
        diambil_ecer_jkt: tEcer.jkt,
        diambil_ecer_seg: tEcer.seg,
        diambil_ecer_btn: tEcer.btn,
        diambil_koli_hv_jkt: tHvKoli,
        diambil_koli_hv_seg: 0,
        diambil_koli_hv_btn: 0,
        diambil_ecer_hv_jkt: tHvEcer,
        diambil_ecer_hv_seg: 0,
        diambil_ecer_hv_btn: 0,
        catatan: catatan.trim() || undefined,
      });
      const sisaKoli =
        (res?.sisa?.koli_jkt ?? 0) +
        (res?.sisa?.koli_seg ?? 0) +
        (res?.sisa?.koli_btn ?? 0);
      swal.success(`Berhasil! Sisa ${sisaKoli} koli.`);
    } catch (e: any) {
      swal.error(e?.message ?? "Gagal menyimpan konfirmasi.");
    }
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
        pending ? "border-l-4 border-l-violet-400" : "border-l-4 border-l-sky-300"
      )}
    >
      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-md bg-[#0c1e3a] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#0c1e3a]">
            Rit {ritKe}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "rounded-md px-2 py-0.5 text-[10px] font-semibold",
              pending
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-sky-200 bg-sky-50 text-sky-700"
            )}
          >
            {pending ? "Belum dikonfirmasi" : "Sisa pengambilan"}
          </Badge>
          <span className="text-[11px] text-slate-500">
            {pending
              ? `${count} input menunggu konfirmasi`
              : "Lanjutan dari pengambilan sebelumnya"}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          <SummaryChip label="Sisa Koli" value={sisa?.sisa_koli ?? 0} tone="blue" />
          <SummaryChip label="Ecer" value={sisa?.sisa_ecer ?? 0} tone="amber" />
          <SummaryChip label="HV" value={sisa?.sisa_hv ?? 0} tone="rose" />
        </div>

        {candidates.length === 0 ? (
          <>
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-xs font-semibold text-amber-900">
                  {isStartOnly ? "Titik start tanpa konfirmasi" : "Driver belum ditugaskan"}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                  {isStartOnly
                    ? "Rit 1 dimulai dari Gudang Outgoing. Titik awal ini tidak dihitung sebagai muat barang dan tidak memerlukan konfirmasi pengambilan."
                    : "Belum ada driver/kendaraan yang bisa dipilih untuk mengambil muatan pada rit ini."}
                </p>
              </div>
            </div>
            {isStartOnly && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled
                  className="h-10 w-full bg-[#0c1e3a] font-semibold text-white hover:bg-[#16335a] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Konfirmasi Pengambilan
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500">
                Driver yang datang mengambil
              </Label>
              <Select
                value={String(selectedRitase)}
                onValueChange={(v) => setSelectedRitase(toInt(v))}
              >
                <SelectTrigger
                  aria-label="Driver yang datang mengambil"
                  className="h-auto min-h-10 w-full whitespace-normal rounded-lg bg-white py-2 text-left text-sm font-semibold leading-snug [&>span]:line-clamp-none [&>span]:whitespace-normal"
                >
                  <SelectValue placeholder="Pilih driver" />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)]">
                  {candidates.map((r) => (
                    <SelectItem
                      key={r.id_ritase}
                      value={String(r.id_ritase)}
                      className="whitespace-normal py-2 leading-snug"
                    >
                      {candidateOptionLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-slate-700">Jumlah diambil</p>
                <Badge
                  variant="outline"
                  className="rounded-md border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600"
                >
                  {confirmTotal} item
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TrioFields
                    title="Diambil Koli"
                    values={tKoli}
                    onChange={setTKoli}
                  />
                  <TrioFields
                    title="Diambil Ecer"
                    values={tEcer}
                    onChange={setTEcer}
                  />
                </div>

                <div className="rounded-lg border border-slate-100 bg-white p-3">
                  <p className="text-xs font-bold text-slate-700">
                    Diambil HV{" "}
                    <span className="font-normal text-slate-400">
                      (sisa {sisa?.sisa_hv ?? 0} gabungan)
                    </span>
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <NumField label="Koli HV" value={tHvKoli} onChange={setTHvKoli} />
                    <NumField label="Ecer HV" value={tHvEcer} onChange={setTHvEcer} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-slate-500">
                Catatan (opsional)
              </Label>
              <Input
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="cth. sisa untuk rit berikutnya"
                className="h-10 text-sm"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={confirmMut.isPending}
                className="h-10 w-full bg-[#0c1e3a] font-semibold text-white hover:bg-[#16335a] sm:w-auto"
              >
                {confirmMut.isPending ? "Menyimpan..." : "Konfirmasi Pengambilan"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
