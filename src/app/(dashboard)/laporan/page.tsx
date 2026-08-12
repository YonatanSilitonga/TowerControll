import { PageHeader } from "@/components/layout/page-header";
import { UnderConstruction } from "@/components/under-construction";

export default function LaporanPage() {
  return (
    <div>
      <PageHeader
        title="Laporan"
        description="Laporan operasional, AWB, dan performa armada."
        crumbs={[{ label: "Laporan" }]}
      />
      <UnderConstruction />
    </div>
  );
}
