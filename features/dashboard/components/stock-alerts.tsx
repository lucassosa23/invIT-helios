import Link from "next/link";
import { ArrowRight, PackageX } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import type { Asset, Location } from "@/lib/fake-data";

type Props = {
  items: Asset[];
  locations: Location[];
};

export function StockAlerts({ items, locations }: Props) {
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l]));

  if (items.length === 0) {
    return (
      <div className="grid place-items-center rounded-md border border-dashed border-border p-8 text-center">
        <PackageX className="size-5 text-muted-foreground/60" />
        <p className="mt-2 text-sm text-muted-foreground">
          Sin alertas. Todo el stock está dentro del umbral.
        </p>
      </div>
    );
  }

  return (
    <ul className="-mx-1 divide-y divide-border/60">
      {items.map((a, idx) => (
        <li
          key={a.id}
          className="animate-fade-in-up group flex items-center gap-3 rounded-md px-1 py-2.5 transition-colors hover:bg-muted/40"
          style={{ animationDelay: `${idx * 25}ms` }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-[13px] font-medium">
                {a.name}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
              {a.category} · {locationMap[a.locationId]?.name ?? "—"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-[12px] tabular-nums">
              <div className="font-medium">
                <span
                  className={
                    a.stock === 0 ? "text-status-out" : "text-status-critical"
                  }
                >
                  {a.stock}
                </span>
                <span className="text-muted-foreground"> / {a.threshold}</span>
              </div>
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80">
                disponible
              </div>
            </div>
            <StatusBadge
              status={a.status === "out" ? "out" : "critical"}
              withDot={false}
            />
          </div>
        </li>
      ))}
      <li className="pt-3">
        <Link
          href="/inventory?filter=critical"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-primary transition-colors hover:text-primary/80"
        >
          Ver todas las alertas <ArrowRight className="size-3.5" />
        </Link>
      </li>
    </ul>
  );
}
