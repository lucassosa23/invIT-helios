import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ReportBuilder } from "@/features/reports/components/report-builder";
import { getInventory } from "@/features/inventory/lib/queries";
import { getOrders } from "@/features/procurement/lib/queries";
import { getRequests } from "@/features/requests/lib/queries";

export const metadata: Metadata = {
  title: "Reporte mensual",
};

export default async function ReportsPage() {
  const [inventory, orders, requests] = await Promise.all([
    getInventory(),
    getOrders(),
    getRequests(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Email mensual"
        title="Reporte mensual"
        description="Armá lo que va a salir el 1 del mes. Items bajo umbral, el plan de compras, órdenes listas y pedidos del equipo — todo en un mail consolidado."
      />
      <ReportBuilder
        inventory={inventory}
        orders={orders}
        requests={requests}
      />
    </div>
  );
}
