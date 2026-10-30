"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { UnderConstruction } from "@/components/under-construction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  type GudangSisaGroup,
} from "@/hooks/use-gudang-muatan";

const toInt = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
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
        className="h-9 text-sm tabular-nums"
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

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-[11px] font-bold tabular-nums",
        className
      )}
    >
      {children}
    </span>
  );
}

const emptyTrio = { jkt: 0, seg: 0, btn: 0 };

export default function GudangPage() {
  const role = useAuthStore((s) => s.user?.role);

  // Fitur input hanya untuk koor_gudang (fadel). Role lain tetap seperti semula.
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
  const [awb, setAwb] = useState(0);
  const [koli, setKoli] = useState({ ...emptyTrio });
  const [ecer, setEcer] = useState({ ...emptyTrio });
  const [hvAwb, setHvAwb] = useState(0);
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

  // Gabung grup pending + sisa per (jenis, rit) — mirror layar kapten.
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
        s != null && (s.sisa_awb > 0 || s.sisa_koli > 0 || s.sisa_ecer > 0);
      if (!p && !adaSisa) return;
      seen.add(key);
      out.push({ key, jenis, ritKe: rit, pending: p, sisa: s });
    };
    for (const p of pending) add(String(p.jenis_ritase ?? ""), toInt(p.ritase_ke));
    for (const s of sisaGrup) add(String(s.jenis_ritase ?? ""), toInt(s.ritase_ke));
    out.sort((a, b) => a.ritKe - b.ritKe || a.jenis.localeCompare(b.jenis));
    return out;
  }, [pending, sisaGrup]);

  const handleSubmit = async () => {
    if (awb <= 0 && koli.jkt + koli.seg + koli.btn <= 0 && ecer.jkt + ecer.seg + ecer.btn <= 0) {
      swal.error("Isi minimal salah satu angka muatan (AWB/Koli/Ecer).");
      return;
    }
    const ok = await swal.confirm(
      "Simpan muatan?",
      `Rit ${ritKe} Outgoing — ${awb} AWB akan dicatat untuk Gudang Outgoing.`,
      "Ya, simpan"
    );
    if (!ok) return;
    try {
      await inputMut.mutateAsync({
        jenis_ritase: "outgoing",
        ritase_ke: ritKe,
        catatan: catatan.trim() || undefined,
        jumlah_awb: awb,
        koli_jkt: koli.jkt,
        koli_seg: koli.seg,
        koli_btn: koli.btn,
        ecer_jkt: ecer.jkt,
        ecer_seg: ecer.seg,
        ecer_btn: ecer.btn,
        koli_hv: hvKoli,
        ecer_hv: hvEcer,
        awb_hv: hvAwb,
      });
      swal.success("Data muatan berhasil disimpan!");
      setAwb(0);
      setKoli({ ...emptyTrio });
      setEcer({ ...emptyTrio });
      setHvAwb(0);
      setHvKoli(0);
      setHvEcer(0);
      setCatatan("");
    } catch (e: any) {
      swal.error(e?.message ?? "Gagal menyimpan data muatan.");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gudang"
        description="Input muatan Gudang Outgoing & konfirmasi pengambilan driver."
        crumbs={[{ label: "Gudang" }]}
      />

      {/* ===== INPUT MUATAN OUTGOING ===== */}
      <Card className="rounded-lg border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Input Muatan Outgoing</CardTitle>
          <p className="text-xs text-slate-500">
            Isi data barang yang masuk ke Gudang Outgoing. Tampil di peta setelah disimpan.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-500">Ritase</Label>
            <select
              value={ritKe}
              onChange={(e) => setRitKe(toInt(e.target.value))}
              className="h-9 w-40 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold outline-none"
            >
              {[1, 2, 3].map((r) => (
                <option key={r} value={r}>
                  Rit {r}
                </option>
              ))}
            </select>
          </div>

          <NumField label="Jumlah AWB" value={awb} onChange={setAwb} />
          <TrioFields title="Koli" values={koli} onChange={setKoli} />
          <TrioFields title="Ecer" values={ecer} onChange={setEcer} />

          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-700">High Value</p>
            <div className="grid grid-cols-3 gap-2">
              <NumField label="AWB HV" value={hvAwb} onChange={setHvAwb} />
              <NumField label="Koli HV" value={hvKoli} onChange={setHvKoli} />
              <NumField label="Ecer HV" value={hvEcer} onChange={setHvEcer} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-500">Catatan (opsional)</Label>
            <Input
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="cth. kiriman pagi"
              className="h-9 text-sm"
            />
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={inputMut.isPending}
            className="bg-[#0c1e3a] font-semibold text-white hover:bg-[#16335a]"
          >
            {inputMut.isPending ? "Menyimpan..." : "Simpan Muatan"}
          </Button>
        </CardContent>
      </Card>

      {/* ===== KONFIRMASI PENGAMBILAN ===== */}
      <Card className="rounded-lg border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold">Konfirmasi Pengambilan</CardTitle>
          <p className="text-xs text-slate-500">
            Pilih driver yang datang mengambil, isi jumlah yang diambil, lalu konfirmasi.
            Muatan berpindah ke mobil driver di peta.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {konfirmasiQ.isLoading || pendingQ.isLoading || ritaseQ.isLoading ? (
            <p className="py-4 text-center text-xs text-slate-400">Memuat data...</p>
          ) : groups.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">
              Tidak ada sisa maupun input baru hari ini.
            </p>
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

      {/* ===== RIWAYAT HARI INI ===== */}
      {riwayat.length > 0 && (
        <Card className="rounded-lg border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">Pengambilan Hari Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {riwayat.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-slate-100 px-3 py-2 text-xs"
              >
                <span className="font-bold text-[#0c1e3a]">Rit {r.ritase_ke}</span>
                <span className="font-semibold">{r.nama_driver || "Driver"}</span>
                <span className="text-slate-400">{r.kode_ritase}</span>
                <span className="ml-auto tabular-nums font-bold text-violet-700">
                  {r.jumlah_awb} AWB
                </span>
                <span className="tabular-nums text-slate-500">
                  {r.total_koli} koli · {r.total_ecer} ecer
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
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

  const candidates = useMemo(
    () =>
      ritases.filter((r) => {
        if (toInt(r.ritase_ke) !== ritKe) return false;
        const rJenis = String(r.jenis_ritase ?? "");
        if (jenis && rJenis && rJenis !== jenis) return false;
        return true;
      }),
    [ritases, ritKe, jenis]
  );
  const [selectedRitase, setSelectedRitase] = useState<number>(0);
  const [catatan, setCatatan] = useState("");

  const [tAwb, setTAwb] = useState(0);
  const [tKoli, setTKoli] = useState({ ...emptyTrio });
  const [tEcer, setTEcer] = useState({ ...emptyTrio });
  const [tHvAwb, setTHvAwb] = useState(0);
  const [tHvKoli, setTHvKoli] = useState(0);
  const [tHvEcer, setTHvEcer] = useState(0);

  // Prefill dari sisa (mirror kapten).
  useEffect(() => {
    setTAwb(sisa?.sisa_awb ?? 0);
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

  const handleConfirm = async () => {
    if (!selectedRitase) {
      swal.error("Pilih driver/ritase pengambil terlebih dahulu.");
      return;
    }
    const total =
      tAwb + tKoli.jkt + tKoli.seg + tKoli.btn + tEcer.jkt + tEcer.seg + tEcer.btn +
      tHvAwb + tHvKoli + tHvEcer;
    if (total <= 0) {
      swal.error("Isi minimal salah satu jumlah yang diambil.");
      return;
    }
    const ok = await swal.confirm(
      "Konfirmasi pengambilan?",
      `${total} item akan dipindahkan ke mobil driver.`,
      "Ya, konfirmasi"
    );
    if (!ok) return;
    try {
      const res = await confirmMut.mutateAsync({
        jenis_ritase: jenis || "outgoing",
        ritase_ke: ritKe,
        id_ritase: selectedRitase,
        diambil_awb: tAwb,
        diambil_koli_jkt: tKoli.jkt,
        diambil_koli_seg: tKoli.seg,
        diambil_koli_btn: tKoli.btn,
        diambil_ecer_jkt: tEcer.jkt,
        diambil_ecer_seg: tEcer.seg,
        diambil_ecer_btn: tEcer.btn,
        diambil_awb_hv_jkt: tHvAwb,
        diambil_awb_hv_seg: 0,
        diambil_awb_hv_btn: 0,
        diambil_koli_hv_jkt: tHvKoli,
        diambil_koli_hv_seg: 0,
        diambil_koli_hv_btn: 0,
        diambil_ecer_hv_jkt: tHvEcer,
        diambil_ecer_hv_seg: 0,
        diambil_ecer_hv_btn: 0,
        catatan: catatan.trim() || undefined,
      });
      swal.success(`Berhasil! Sisa ${res?.sisa?.jumlah_awb ?? 0} AWB.`);
    } catch (e: any) {
      swal.error(e?.message ?? "Gagal menyimpan konfirmasi.");
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-blue-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-[#0c1e3a] px-2 py-1 text-xs font-bold text-white">
          Rit {ritKe}
        </span>
        <span className="text-xs font-medium text-slate-500">
          {pending ? `${count} input belum terkonfirmasi` : "Sisa dari pengambilan sebelumnya"}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Chip className="bg-violet-100 text-violet-700">Sisa: {sisa?.sisa_awb ?? 0} AWB</Chip>
        <Chip className="bg-blue-100 text-blue-700">{sisa?.sisa_koli ?? 0} Koli</Chip>
        <Chip className="bg-amber-100 text-amber-700">{sisa?.sisa_ecer ?? 0} Ecer</Chip>
      </div>

      {candidates.length === 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Driver belum ditugaskan untuk mengambil muatan.
        </p>
      ) : (
        <>
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-500">
              Driver yang datang mengambil
            </Label>
            <select
              value={selectedRitase}
              onChange={(e) => setSelectedRitase(toInt(e.target.value))}
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold outline-none"
            >
              {candidates.map((r) => (
                <option key={r.id_ritase} value={r.id_ritase}>
                  {r.nama_driver || "Driver"} • Rit {r.ritase_ke}
                  {r.plat_nomor && r.plat_nomor !== "-" ? ` • ${r.plat_nomor}` : ""}
                </option>
              ))}
            </select>
          </div>

          <NumField label="Diambil (AWB)" value={tAwb} onChange={setTAwb} />
          <TrioFields title="Diambil Koli" values={tKoli} onChange={setTKoli} />
          <TrioFields title="Diambil Ecer" values={tEcer} onChange={setTEcer} />
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-700">
              Diambil HV{" "}
              <span className="font-normal text-slate-400">
                (sisa {(sisa?.sisa_hv ?? 0)} gabungan)
              </span>
            </p>
            <div className="grid grid-cols-3 gap-2">
              <NumField label="AWB HV" value={tHvAwb} onChange={setTHvAwb} />
              <NumField label="Koli HV" value={tHvKoli} onChange={setTHvKoli} />
              <NumField label="Ecer HV" value={tHvEcer} onChange={setTHvEcer} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-slate-500">Catatan (opsional)</Label>
            <Input
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="cth. sisa untuk rit berikutnya"
              className="h-9 text-sm"
            />
          </div>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={confirmMut.isPending}
            className="bg-[#0c1e3a] font-semibold text-white hover:bg-[#16335a]"
          >
            {confirmMut.isPending ? "Menyimpan..." : "Konfirmasi Pengambilan"}
          </Button>
        </>
      )}
    </div>
  );
}
