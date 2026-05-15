import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { InventoryList } from "@/features/inventory/components/inventory-list";
import { getLocations } from "@/lib/fake-data";
import type { Status } from "@/lib/fake-data";

export const metadata: Metadata = {
  title: "Inventario",
};

type Params = { q?: string; filter?: string };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const initialQuery = sp.q ?? "";
  const initialStatus: "all" | Status =
    sp.filter === "critical" || sp.filter === "low" ? sp.filter : "all";

  const locations = getLocations();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Equipos, periféricos y repuestos"
        title="Inventario"
        description="Importá tu Excel para arrancar. Sumá, editá y ajustá el stock con un clic — todo queda guardado en este navegador."
      />
      <InventoryList
        locations={locations}
        initialQuery={initialQuery}
        initialStatus={initialStatus}
      />
    </div>
  );
}
