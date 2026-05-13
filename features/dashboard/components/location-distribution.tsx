"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import type { Location, Status } from "@/lib/fake-data";
import type { InventoryStats } from "../lib/use-inventory-stats";

const DOT: Record<Status, string> = {
  healthy: "bg-status-healthy",
  low: "bg-status-low",
  critical: "bg-status-critical",
  out: "bg-status-out",
};

const PULSE: Record<Status, boolean> = {
  healthy: false,
  low: true,
  critical: true,
  out: true,
};

type Props = {
  byLocation: InventoryStats["byLocation"];
  locations: Location[];
};

export function LocationDistribution({ byLocation, locations }: Props) {
  const locMap = Object.fromEntries(locations.map((l) => [l.id, l]));
  const sorted = byLocation.slice(0, 6);

  return (
    <section className="animate-fade-in-up flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
      <header className="mb-4">
        <h2 className="text-[16px] font-semibold tracking-tight">
          Distribución por sede
        </h2>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          Composición de stock por ubicación.
        </p>
      </header>

      {sorted.length === 0 ? (
        <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-[13px] text-muted-foreground">
            Sin datos de ubicación. Importá tu inventario para verlo.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sorted.map((loc, i) => {
            const meta = locMap[loc.locationId];
            const name = meta?.name ?? "Ubicación desconocida";
            const tone = loc.dominant;
            const max = Math.max(1, loc.total);
            const segments = [
              {
                key: "healthy",
                count: loc.counts.healthy,
                color: "bg-status-healthy",
              },
              { key: "low", count: loc.counts.low, color: "bg-status-low" },
              {
                key: "critical",
                count: loc.counts.critical,
                color: "bg-status-critical",
              },
              { key: "out", count: loc.counts.out, color: "bg-status-out" },
            ];
            return (
              <motion.li
                key={loc.locationId}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className="group flex cursor-default items-center gap-3 rounded-lg p-2 transition-colors hover:bg-background/60"
              >
                <span className="relative inline-flex size-2 shrink-0">
                  {PULSE[tone] && (
                    <span
                      className={cn(
                        "absolute inset-0 animate-ping rounded-full opacity-70",
                        DOT[tone],
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative inline-block size-2 rounded-full",
                      DOT[tone],
                    )}
                  />
                </span>
                <span className="flex-1 truncate text-[13px] font-medium">
                  {name}
                </span>
                <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-muted/60 ring-1 ring-foreground/[0.04]">
                  {segments.map((s) =>
                    s.count > 0 ? (
                      <span
                        key={s.key}
                        className={cn("h-full", s.color)}
                        style={{ width: `${(s.count / max) * 100}%` }}
                      />
                    ) : null,
                  )}
                </div>
                <span className="w-10 text-right text-[12px] font-mono font-medium tabular-nums text-muted-foreground">
                  {loc.total}
                </span>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
