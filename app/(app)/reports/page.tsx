import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ReportBuilder } from "@/features/reports/components/report-builder";

export const metadata: Metadata = {
  title: "Reporte mensual",
};

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Email mensual"
        title="Reporte mensual"
        description="Armá lo que va a salir el 1 del mes. Items bajo umbral, el plan de compras, órdenes listas y pedidos del equipo — todo en un mail consolidado."
      />
      <ReportBuilder />
    </div>
  );
}
