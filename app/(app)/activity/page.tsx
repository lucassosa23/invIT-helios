import type { Metadata } from "next";
import { Activity } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { getActivity } from "@/lib/fake-data";

export const metadata: Metadata = {
  title: "Actividad",
};

export default function ActivityPage() {
  const events = getActivity();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="En vivo · últimos 7 días"
        title="Actividad"
        description="Registro completo de movimientos en inventario, compras y pedidos."
      />
      <Card>
        <CardContent className="px-5 pb-5 pt-2">
          <div className="mb-4 flex items-center gap-2 text-[12px] text-muted-foreground">
            <Activity className="size-3.5" />
            <span className="dot-live" />
            <span>Eventos en tiempo real</span>
          </div>
          <ActivityFeed events={events} />
        </CardContent>
      </Card>
    </div>
  );
}
