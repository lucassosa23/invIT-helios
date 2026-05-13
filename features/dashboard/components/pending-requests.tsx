import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";

import type { Priority, RequestItem } from "@/lib/fake-data";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

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

export function PendingRequests({ items }: { items: RequestItem[] }) {
  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-md border border-dashed border-border p-8 text-center">
        <Inbox className="size-5 text-muted-foreground/60" />
        <p className="mt-2 text-sm text-muted-foreground">
          No hay pedidos esperando respuesta.
        </p>
      </div>
    );
  }

  return (
    <ul className="-mx-1 divide-y divide-border/60">
      {items.map((r, idx) => (
        <li
          key={r.id}
          className="animate-fade-in-up group flex items-center gap-3 rounded-md px-1 py-2.5 transition-colors hover:bg-muted/40"
          style={{ animationDelay: `${idx * 25}ms` }}
        >
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-primary/10 text-[11.5px] font-semibold text-primary-foreground ring-1 ring-primary/30">
            {r.requester.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13px] font-medium">
                {r.requester.name}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                  PRIORITY_TONE[r.priority],
                )}
              >
                {PRIORITY_LABEL[r.priority]}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {r.qty} × {r.itemName}
            </div>
          </div>
          <time
            className="shrink-0 text-[11px] text-muted-foreground tabular-nums"
            title={r.createdAt.toLocaleString("es-AR")}
          >
            {formatRelative(r.createdAt)}
          </time>
        </li>
      ))}
      <li className="pt-3">
        <Link
          href="/requests"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary transition-colors hover:text-primary/80"
        >
          Ver todos los pedidos <ArrowRight className="size-3.5" />
        </Link>
      </li>
    </ul>
  );
}
