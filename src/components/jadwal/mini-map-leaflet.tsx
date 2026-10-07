"use client";

import { useEffect, useRef } from "react";
import type { AdminRitaseStop } from "@/types/armada";

export type LocationLookup = Map<string, [number, number]>;

interface MiniMapLeafletProps {
  stops: AdminRitaseStop[];
  ritaseId: number;
  locationLookup?: LocationLookup;
}

const JAKARTA: [number, number] = [-6.2088, 106.8456];

/** Resolve koordinat asli dari lookup. Fallback ke null jika tidak ditemukan. */
function resolveCoord(
  stop: AdminRitaseStop,
  lookup?: LocationLookup
): [number, number] | null {
  if (!lookup) return null;
  if (stop.id_seller != null) {
    const c = lookup.get("seller_" + stop.id_seller);
    if (c) return c;
  }
  if (stop.id_gudang != null) {
    const c = lookup.get("gudang_" + stop.id_gudang);
    if (c) return c;
  }
  if (stop.id_drop_point != null) {
    const c = lookup.get("dp_" + stop.id_drop_point);
    if (c) return c;
  }
  return null;
}

/** Warna marker sesuai jenis stop */
function stopColor(jenis: string): string {
  switch ((jenis ?? "").toLowerCase()) {
    case "gudang": return "#0c1e3a";
    case "seller": return "#10b981";
    case "gateway":
    case "drop_point": return "#f97316";
    default: return "#64748b";
  }
}

export function MiniMapLeaflet({
  stops,
  ritaseId,
  locationLookup,
}: MiniMapLeafletProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !divRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(divRef.current, {
        center: JAKARTA,
        zoom: 11,
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
        attributionControl: false,
        boxZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      // Resolve koordinat — pakai koordinat asli jika ada
      const coords: ([number, number] | null)[] = stops.map((s) =>
        resolveCoord(s, locationLookup)
      );

      // Filter stops yang punya koordinat asli
      const validCoords = coords.filter((c): c is [number, number] => c !== null);

      // Gambar polyline jika minimal 2 titik valid berurutan
      const polylinePoints: [number, number][] = [];
      coords.forEach((c) => { if (c) polylinePoints.push(c); });
      if (polylinePoints.length >= 2) {
        L.polyline(polylinePoints, {
          color: "#0c1e3a",
          weight: 2.5,
          opacity: 0.85,
          dashArray: undefined,
        }).addTo(map);
      }

      // Tambah marker bernomor per stop
      stops.forEach((stop, i) => {
        const pos = coords[i];
        if (!pos) return; // skip stop tanpa koordinat

        const color = stopColor(stop.jenis_stop);
        const num = stop.urutan ?? i + 1;
        const icon = L.divIcon({
          className: "",
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          html:
            "<div style=\"width:26px;height:26px;" +
            "background:" + color + ";" +
            "border:2.5px solid #fff;" +
            "border-radius:50%;" +
            "box-shadow:0 2px 6px rgba(0,0,0,.45);" +
            "display:flex;align-items:center;justify-content:center;" +
            "color:#fff;font-size:10.5px;font-weight:800;font-family:system-ui,sans-serif;\">" +
            num +
            "</div>",
        });
        const marker = L.marker(pos, { icon, interactive: false });
        marker.addTo(map);
      });

      // Fit bounds ke koordinat asli, fallback JAKARTA
      if (validCoords.length === 1) {
        map.setView(validCoords[0], 14);
      } else if (validCoords.length >= 2) {
        try {
          map.fitBounds(L.latLngBounds(validCoords), {
            padding: [22, 22],
            maxZoom: 15,
          });
        } catch {
          map.setView(JAKARTA, 11);
        }
      } else {
        // Tidak ada koordinat → tampilkan area Jakarta/Tangerang
        map.setView(JAKARTA, 11);
      }

      mapRef.current = map;

      // Pantau perubahan ukuran card agar peta selalu flexible / full height
      let ro: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined" && divRef.current) {
        ro = new ResizeObserver(() => {
          if (!cancelled && mapRef.current) {
            (mapRef.current as { invalidateSize: () => void }).invalidateSize();
          }
        });
        ro.observe(divRef.current);
      }

      setTimeout(() => {
        if (!cancelled && mapRef.current) {
          (mapRef.current as { invalidateSize: () => void }).invalidateSize();
        }
      }, 150);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        (mapRef.current as { remove: () => void }).remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={divRef} className="h-full w-full min-h-[220px]" />;
}
