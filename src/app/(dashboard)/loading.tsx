import { Skeleton } from "@/components/ui/skeleton";

/** Loading untuk area dashboard (ganti halaman) — skeleton branded, feedback "lagi proses". */
export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[90px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-[55vh] rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
