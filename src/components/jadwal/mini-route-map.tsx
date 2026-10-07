"use client";

import React, { useMemo } from "react";
import type { AdminRitaseStop } from "@/types/armada";

interface MiniRouteMapProps {
  stops: AdminRitaseStop[];
  ritaseId: number;
}

export function MiniRouteMap({ stops, ritaseId }: MiniRouteMapProps) {
  // Hitung titik koordinat simulasi sirkuit rute yang konsisten dan rapi
  const points = useMemo(() => {
    const count = Math.max(stops.length, 3);
    const pts: Array<{ x: number; y: number; num: number; label: string }> = [];

    // Pre-computed polygonal layouts untuk 3, 4, 5, 6+ stops agar loop rute tampak alami seperti jalan logistik
    const layouts: Record<number, Array<[number, number]>> = {
      3: [[55, 30], [30, 85], [140, 105]],
      4: [[60, 25], [35, 65], [60, 100], [130, 115]],
      5: [[65, 25], [30, 55], [45, 95], [105, 115], [140, 70]],
    };

    const defaultLayout = layouts[Math.min(count, 5)] || [
      [50, 25],
      [30, 60],
      [55, 100],
      [125, 115],
      [145, 60],
    ];

    stops.forEach((s, idx) => {
      const coord = defaultLayout[idx % defaultLayout.length];
      // Variasi sedikit berdasarkan ritaseId agar tiap kartu unik tapi tetap konsisten
      const jitterX = ((ritaseId * (idx + 1) * 7) % 12) - 6;
      const jitterY = ((ritaseId * (idx + 2) * 11) % 10) - 5;
      pts.push({
        x: Math.max(25, Math.min(160, coord[0] + jitterX)),
        y: Math.max(20, Math.min(125, coord[1] + jitterY)),
        num: s.urutan || idx + 1,
        label: s.nama_lokasi,
      });
    });

    return pts;
  }, [stops, ritaseId]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    return points.reduce((acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`, "");
  }, [points]);

  return (
    <div className="relative h-full min-h-[145px] w-full overflow-hidden rounded-lg border border-slate-200/90 bg-[#f4f6f8]">
      {/* Background Street Map Pattern (Jalanan kuning, jalan putih, blok kota halus) */}
      <svg
        className="absolute inset-0 h-full w-full opacity-80"
        viewBox="0 0 190 140"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {/* City Blocks */}
        <rect width="190" height="140" fill="#edf2f7" />
        <rect x="15" y="10" width="35" height="40" rx="3" fill="#e2e8f0" />
        <rect x="70" y="15" width="45" height="30" rx="3" fill="#e2e8f0" />
        <rect x="130" y="12" width="45" height="38" rx="3" fill="#e2e8f0" />
        <rect x="15" y="70" width="30" height="50" rx="3" fill="#e2e8f0" />
        <rect x="75" y="65" width="35" height="40" rx="3" fill="#e2e8f0" />
        <rect x="135" y="70" width="45" height="55" rx="3" fill="#e2e8f0" />

        {/* River/Water Feature Soft Blue */}
        <path
          d="M175 0 C165 40, 180 80, 170 140"
          stroke="#cbd5e1"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Secondary Streets (White) */}
        <path d="M0 35 L190 35" stroke="#ffffff" strokeWidth="4" />
        <path d="M0 80 L190 80" stroke="#ffffff" strokeWidth="4" />
        <path d="M0 115 L190 115" stroke="#ffffff" strokeWidth="3" />
        <path d="M45 0 L45 140" stroke="#ffffff" strokeWidth="4" />
        <path d="M110 0 L110 140" stroke="#ffffff" strokeWidth="4" />

        {/* Main Highway Arterial (Yellow / Amber) */}
        <path
          d="M60 0 C65 40, 50 85, 75 140"
          stroke="#fde047"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M60 0 C65 40, 50 85, 75 140"
          stroke="#f59e0b"
          strokeWidth="1.5"
          strokeDasharray="2 3"
        />
        <path
          d="M150 0 C145 50, 155 90, 140 140"
          stroke="#fde047"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>

      {/* Polyline Route Overlay */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 190 140"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Glow / Outline around path */}
        <path
          d={pathD}
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Main Route Line (Dark Navy #0c1e3a) */}
        <path
          d={pathD}
          fill="none"
          stroke="#0c1e3a"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={stops.length > 4 ? "4 2" : "none"}
        />

        {/* Stop Number Markers ❶ ❷ ❸ ❹ */}
        {points.map((pt) => (
          <g key={pt.num} className="cursor-pointer transition-transform hover:scale-110">
            {/* Outer halo */}
            <circle cx={pt.x} cy={pt.y} r="8.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
            {/* Black Circle Badge */}
            <circle cx={pt.x} cy={pt.y} r="7" fill="#0c1e3a" />
            {/* White Number */}
            <text
              x={pt.x}
              y={pt.y + 3.2}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="8.5"
              fontWeight="bold"
              fontFamily="sans-serif"
            >
              {pt.num}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
