import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { RequestsShell } from "@/features/requests/components/requests-shell";
import { getRequests } from "@/features/requests/lib/queries";

export const metadata: Metadata = {
  title: "Pedidos",
};

export default async function RequestsPage() {
  const requests = await getRequests();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Pedidos del equipo + Nuestras compras"
        title="Pedidos"
        description="Arriba: pedidos del personal (se entregan del stock o quedan esperando compra). Abajo: las órdenes que ya enviamos al proveedor, esperando confirmar la entrega para sumar al stock."
      />
      <RequestsShell requests={requests} />
    </div>
  );
}
