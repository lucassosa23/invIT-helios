import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import {
  getInventory,
  getInventoryLocations,
} from "@/features/inventory/lib/queries";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getActivity,
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

function firstName(name: string | undefined): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0]!;
}

export default async function DashboardPage() {
  const [assets, locations, user] = await Promise.all([
    getInventory(),
    getInventoryLocations(),
    getCurrentUser(),
  ]);

  // Procurement / requests / activity todavía viven en fake-data; las
  // migra el próximo commit. El dashboard ya consume el inventario real
  // (KPIs, alertas, distribuciones), que es la métrica que más mueve.
  const procurement = getProcurementQueue();
  const requests = getRequests();
  const activity = getActivity(10);

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const first = firstName(user?.name);
  const title = first ? `${greeting()}, ${first}` : greeting();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={today}
        title={title}
        description="Cockpit operativo. Pulso del inventario, alertas y acciones de hoy."
      />

      <DashboardShell
        assets={assets}
        locations={locations}
        procurement={procurement}
        requests={requests}
        activity={activity}
      />
    </div>
  );
}
