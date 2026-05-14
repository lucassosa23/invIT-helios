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
        eyebrow="Planificación mensual"
        title="Compras"
        description="Organizá lo que vas a comprar el próximo mes. Una vez que marcás una orden como enviada, pasa a Pedidos → Nuestras compras para esperar la entrega."
      />
      <ProcurementShell />
    </div>
  );
}
