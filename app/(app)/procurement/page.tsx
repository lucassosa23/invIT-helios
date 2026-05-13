import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ProcurementShell } from "@/features/procurement/components/procurement-shell";

export const metadata: Metadata = {
  title: "Compras",
};

export default function ProcurementPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Plan de compras del mes"
        title="Compras"
        description="Creá órdenes con los items que necesitan reposición. Cuando una orden se marca como recibida, el stock se actualiza solo."
      />
      <ProcurementShell />
    </div>
  );
}
