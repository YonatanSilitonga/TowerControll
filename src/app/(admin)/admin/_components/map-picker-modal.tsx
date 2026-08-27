"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { X, MapPin, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Dynamic import Leaflet component with SSR disabled
const LeafletMapPickerInner = dynamic(() => import("./map-picker-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center bg-slate-100 text-xs text-slate-400 dark:bg-slate-800">
      Memuat Peta Interaktif…
    </div>
  ),
});

export function MapPickerModal({
  open,
  onClose,
  initialLat,
  initialLng,
  onSelectLocation,
}: {
  open: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  onSelectLocation: (lat: number, lng: number, address?: string) => void;
}) {
  const [lat, setLat] = useState<number>(initialLat ?? -6.21);
  const [lng, setLng] = useState<number>(initialLng ?? 106.845);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setLat(initialLat && !isNaN(initialLat) ? initialLat : -6.21);
      setLng(initialLng && !isNaN(initialLng) ? initialLng : 106.845);
    }
  }, [open, initialLat, initialLng]);

  if (!open) return null;

  const handleConfirm = () => {
    onSelectLocation(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
    onClose();
  };

  const handleSearchAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        setLat(parseFloat(data[0].lat));
        setLng(parseFloat(data[0].lon));
      } else {
        alert("Lokasi tidak ditemukan. Coba kata kunci yang lebih spesifik.");
      }
    } catch {
      alert("Gagal mencari lokasi.");
    }
    setSearching(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Pilih Titik Lokasi</h3>
              <p className="text-xs text-slate-500">Klik di peta untuk memperbarui koordinat</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <form onSubmit={handleSearchAddress} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama area/kota (misal: Cikupa Tangerang)..."
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={searching} variant="outline" className="text-xs">
              {searching ? "Mencari…" : "Cari Lokasi"}
            </Button>
          </form>
        </div>

        {/* Map area */}
        <div className="h-72 w-full overflow-hidden relative">
          <LeafletMapPickerInner lat={lat} lng={lng} onChange={(newLat, newLng) => {
            setLat(newLat);
            setLng(newLng);
          }} />
        </div>

        {/* Coordinates readout & footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-4 text-xs font-mono text-slate-600 dark:text-slate-300">
            <div>
              <span className="font-semibold text-slate-400">Lat:</span> {lat.toFixed(6)}
            </div>
            <div>
              <span className="font-semibold text-slate-400">Lng:</span> {lng.toFixed(6)}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="text-xs">
              Batal
            </Button>
            <Button onClick={handleConfirm} className="bg-[#FEA103] text-xs text-white hover:bg-[#E09102]">
              <Check className="mr-1 h-3.5 w-3.5 text-white" />
              Gunakan Koordinat Ini
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
