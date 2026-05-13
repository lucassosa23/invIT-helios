import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import {
  getActivity,
  getAssets,
  getLocations,
  getProcurementQueue,
  getRequests,
} from "@/lib/fake-data";

export const metadata: Metadata = {
  title: "Inicio",
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
};

export default function DashboardPage() {
  const fallbackAssets = getAssets();
  const locations = getLocations();
  const procurement = getProcurementQueue();
  const requests = getRequests();
  const activity = getActivity(10);

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={today}
        title={`${greeting()}, Lucas`}
        description="Cockpit operativo. Pulso del inventario, alertas y acciones de hoy."
      />

      <DashboardShell
        fallbackAssets={fallbackAssets}
        locations={locations}
        procurement={procurement}
        requests={requests}
        activity={activity}
      />
    </div>
  );
}
