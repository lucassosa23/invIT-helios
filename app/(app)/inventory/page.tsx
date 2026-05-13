import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { InventoryList } from "@/features/inventory/components/inventory-list";
import { getLocations } from "@/lib/fake-data";

export const metadata: Metadata = {
  title: "Inventario",
};

export default function InventoryPage() {
  const locations = getLocations();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Equipos, periféricos y repuestos"
        title="Inventario"
        description="Importá tu Excel para arrancar. Sumá, editá y ajustá el stock con un clic — todo queda guardado en este navegador."
      />
      <InventoryList initialAssets={[]} locations={locations} />
    </div>
  );
}
