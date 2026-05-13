import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = {
  title: "Ajustes",
};

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Workspace"
        title="Ajustes"
        description="Configuración del workspace, miembros, proveedores e integraciones."
      />
      <EmptyState
        icon={Settings}
        title="Acá vas a configurar todo el workspace"
        description="Miembros, ubicaciones, proveedores, umbrales de stock y notificaciones. Disponible en la próxima iteración."
        features={[
          "Miembros y roles (admin / operador / lectura)",
          "Sedes y depósitos",
          "Catálogo de proveedores",
          "Umbrales de stock por categoría",
          "Notificaciones por email y Slack",
          "Tokens de API y webhooks",
        ]}
      />
    </div>
  );
}
