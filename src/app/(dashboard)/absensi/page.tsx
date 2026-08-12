import { PageHeader } from "@/components/layout/page-header";
import { UnderConstruction } from "@/components/under-construction";

export default function AbsensiPage() {
  return (
    <div>
      <PageHeader
        title="Absensi"
        description="Rekap kehadiran & produktivitas manpower harian."
        crumbs={[{ label: "Absensi" }]}
      />
      <UnderConstruction />
    </div>
  );
}
