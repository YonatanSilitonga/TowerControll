"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminRitaseStop } from "@/types/armada";
import type { LocationLookup } from "./mini-map-leaflet";

const MiniMapLeaflet = dynamic(
  () => import("./mini-map-leaflet").then((m) => ({ default: m.MiniMapLeaflet })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-1.5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#0c1e3a]" />
          <span className="text-[10px] text-slate-400">Memuat peta...</span>
        </div>
      </div>
    ),
  }
);

interface MiniMapWrapperProps {
  stops: AdminRitaseStop[];
  ritaseId: number;
  locationLookup?: LocationLookup;
  className?: string;
}

export function MiniMapWrapper({
  stops,
  ritaseId,
  locationLookup,
  className,
}: MiniMapWrapperProps) {
  return (
    <div className={"overflow-hidden h-full w-full " + (className ?? "")}>
      <MiniMapLeaflet
        stops={stops}
        ritaseId={ritaseId}
        locationLookup={locationLookup}
      />
    </div>
  );
}
