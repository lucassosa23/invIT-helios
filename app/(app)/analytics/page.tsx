import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Reportes",
};

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Próximamente"
        title="Reportes"
        description="Tendencias, métricas y vistas guardadas para tomar mejores decisiones operativas."
      />
      <EmptyState
        icon={BarChart3}
        title="Pronto vas a tener reportes acá"
        description="En la próxima iteración sumamos vistas interactivas, filtros por período y exportación."
        features={[
          "Rotación de inventario y mapas de quiebres de stock",
          "Compras por proveedor y categoría",
          "Tiempos de respuesta a pedidos por equipo",
          "Garantías por vencer en los próximos 90 días",
          "Guardar y compartir vistas propias",
        ]}
        action={<Button size="sm">Avisarme cuando esté listo</Button>}
      />
    </div>
  );
}
