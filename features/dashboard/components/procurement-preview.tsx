import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import type { ProcurementItem, ProcurementStatus } from "@/lib/fake-data";
import { getVendors } from "@/lib/fake-data";

const STATUS_LABEL: Record<ProcurementStatus, string> = {
  pending: "Pendiente",
  ready: "Lista para enviar",
  ordered: "Enviada",
  received: "Recibida",
};

const STATUS_TONE: Record<
  ProcurementStatus,
  React.ComponentProps<typeof StatusBadge>["status"]
> = {
  pending: "low",
  ready: "info",
  ordered: "info",
  received: "healthy",
};

export function ProcurementPreview({ items }: { items: ProcurementItem[] }) {
  const vendors = Object.fromEntries(getVendors().map((v) => [v.id, v]));

  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-md border border-dashed border-border p-8 text-center">
        <ShoppingBag className="size-5 text-muted-foreground/60" />
        <p className="mt-2 text-sm text-muted-foreground">
          No hay compras pendientes.
        </p>
      </div>
    );
  }

  return (
    <ul className="-mx-1 divide-y divide-border/60">
      {items.map((p, idx) => (
        <li
          key={p.id}
          className="animate-fade-in-up group flex items-center gap-3 rounded-md px-1 py-2.5 transition-colors hover:bg-muted/40"
          style={{ animationDelay: `${idx * 25}ms` }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                {p.reference}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[13px] font-medium">
              {p.itemName}
            </div>
            <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {vendors[p.vendorId]?.name} · {p.qty} unidades
            </div>
          </div>
          <StatusBadge
            status={STATUS_TONE[p.status]}
            label={STATUS_LABEL[p.status]}
            withDot={false}
          />
        </li>
      ))}
      <li className="pt-3">
        <Link
          href="/procurement"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary transition-colors hover:text-primary/80"
        >
          Ver cola completa <ArrowRight className="size-3.5" />
        </Link>
      </li>
    </ul>
  );
}
