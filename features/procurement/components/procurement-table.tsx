"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type {
  Priority,
  ProcurementItem,
  ProcurementStatus,
  Vendor,
} from "@/lib/fake-data";

const STATUS_OPTIONS: Array<{
  value: "all" | ProcurementStatus;
  label: string;
  tone?: React.ComponentProps<typeof StatusBadge>["status"];
}> = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes", tone: "low" },
  { value: "ready", label: "Listas", tone: "info" },
  { value: "ordered", label: "Enviadas", tone: "info" },
  { value: "received", label: "Recibidas", tone: "healthy" },
];

const STATUS_TONE: Record<
  ProcurementStatus,
  React.ComponentProps<typeof StatusBadge>["status"]
> = {
  pending: "low",
  ready: "info",
  ordered: "info",
  received: "healthy",
};

const STATUS_LABEL: Record<ProcurementStatus, string> = {
  pending: "Pendiente",
  ready: "Lista para enviar",
  ordered: "Enviada",
  received: "Recibida",
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

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
});

export function ProcurementTable({
  items,
  vendors,
}: {
  items: ProcurementItem[];
  vendors: Vendor[];
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ProcurementStatus>("all");

  const vendorMap = useMemo(
    () => Object.fromEntries(vendors.map((v) => [v.id, v])),
    [vendors],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (q) {
        const hay = `${p.itemName} ${p.reference} ${p.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, query, status]);

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 p-3">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar referencia, item…"
            className="h-9 max-w-sm pl-8"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full border border-transparent px-2.5 text-[12px] font-medium transition-colors",
                status === opt.value
                  ? "border-border bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {opt.tone && (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    opt.tone === "healthy" && "bg-status-healthy",
                    opt.tone === "low" && "bg-status-low",
                    opt.tone === "info" && "bg-status-info",
                  )}
                />
              )}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border/70 hover:bg-transparent">
            <TableHead className="pl-4 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Referencia
            </TableHead>
            <TableHead className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Item
            </TableHead>
            <TableHead className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Proveedor
            </TableHead>
            <TableHead className="text-right text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Cantidad
            </TableHead>
            <TableHead className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Prioridad
            </TableHead>
            <TableHead className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Estado
            </TableHead>
            <TableHead className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Entrega estimada
            </TableHead>
            <TableHead className="w-10 pr-3" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((p) => (
            <TableRow key={p.id} className="border-border/60">
              <TableCell className="pl-4 font-mono text-[11.5px] uppercase tracking-wider text-muted-foreground">
                {p.reference}
              </TableCell>
              <TableCell>
                <div className="flex flex-col leading-tight">
                  <span className="text-[13px] font-medium">{p.itemName}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {p.category}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-[12.5px] text-muted-foreground">
                {vendorMap[p.vendorId]?.name ?? "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-[12px] tabular-nums">
                {p.qty}
              </TableCell>
              <TableCell>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
                    PRIORITY_TONE[p.priority],
                  )}
                >
                  {PRIORITY_LABEL[p.priority]}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={STATUS_TONE[p.status]}
                  label={STATUS_LABEL[p.status]}
                  withDot={false}
                />
              </TableCell>
              <TableCell className="text-[12.5px] text-muted-foreground">
                {dateFmt.format(p.expectedBy)}
              </TableCell>
              <TableCell className="pr-3 text-right">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Acciones de la orden"
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={8}
                className="py-10 text-center text-sm text-muted-foreground"
              >
                No hay órdenes que coincidan con los filtros.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t border-border/70 px-4 py-2.5 text-[12px] text-muted-foreground">
        <span>
          Mostrando{" "}
          <span className="font-medium text-foreground tabular-nums">
            {filtered.length}
          </span>{" "}
          de {items.length} órdenes
        </span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="xs" disabled>
            Anterior
          </Button>
          <Button variant="ghost" size="xs" disabled>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
