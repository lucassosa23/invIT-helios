import type { Metadata } from "next";
import { Inbox, MessageSquare, Plus } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRequests } from "@/lib/fake-data";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Priority, RequestStatus } from "@/lib/fake-data";

export const metadata: Metadata = {
  title: "Pedidos",
};

const STATUS_TONE: Record<
  RequestStatus,
  React.ComponentProps<typeof StatusBadge>["status"]
> = {
  pending: "low",
  approved: "info",
  ordered: "info",
  delivered: "healthy",
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  ordered: "En compra",
  delivered: "Entregado",
};

const PRIORITY_TONE: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-status-info-soft text-status-info",
  high: "bg-status-low-soft text-status-low",
  urgent: "bg-status-critical-soft text-status-critical",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export default function RequestsPage() {
  const requests = getRequests().sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const pending = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={`${pending} esperan respuesta`}
        title="Pedidos"
        description="Solicitudes de hardware enviadas por el equipo, ordenadas por las más recientes."
        action={
          <Button size="sm">
            <Plus className="size-3.5" />
            Nuevo pedido
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/70 px-5 py-3">
          <CardTitle className="flex items-center gap-2 text-[14px]">
            <Inbox className="size-4 text-muted-foreground" />
            Bandeja
          </CardTitle>
          <span className="text-[11.5px] uppercase tracking-wider text-muted-foreground">
            {requests.length} en total
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border/60">
            {requests.map((r, i) => (
              <li
                key={r.id}
                className={cn(
                  "animate-fade-in-up grid gap-3 px-5 py-3 transition-colors hover:bg-muted/40",
                  "grid-cols-[auto_1fr_auto_auto] items-center",
                )}
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-primary/10 text-[11.5px] font-semibold text-primary-foreground ring-1 ring-primary/30">
                  {r.requester.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                      {r.reference}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10.5px] font-medium",
                        PRIORITY_TONE[r.priority],
                      )}
                    >
                      {PRIORITY_LABEL[r.priority]}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px]">
                    <span className="font-medium">{r.requester.name}</span>{" "}
                    <span className="text-muted-foreground">pidió</span>{" "}
                    <span className="font-medium">
                      {r.qty} × {r.itemName}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {r.requester.team} · {formatRelative(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11.5px] text-muted-foreground">
                  {r.comments > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="size-3.5" />
                      {r.comments}
                    </span>
                  )}
                </div>
                <StatusBadge
                  status={STATUS_TONE[r.status]}
                  label={STATUS_LABEL[r.status]}
                  withDot={false}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
