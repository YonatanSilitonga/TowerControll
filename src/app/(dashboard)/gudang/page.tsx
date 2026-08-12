import { PageHeader } from "@/components/layout/page-header";
import { UnderConstruction } from "@/components/under-construction";

export default function GudangPage() {
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
