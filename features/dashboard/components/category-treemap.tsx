"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { LayoutGrid, BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { InventoryStats } from "../lib/use-inventory-stats";
import type { Status } from "@/lib/fake-data";

type Mode = "treemap" | "bars";

type Props = {
  byCategory: InventoryStats["byCategory"];
};

const DOMINANT_CLASS: Record<
  Status,
  { tint: string; ring: string; label: string }
> = {
  healthy: {
    tint: "bg-status-healthy/[0.08]",
    ring: "ring-status-healthy/30",
    label: "text-status-healthy",
  },
  low: {
    tint: "bg-status-low/[0.10]",
    ring: "ring-status-low/30",
    label: "text-status-low",
  },
  critical: {
    tint: "bg-status-critical/[0.10]",
    ring: "ring-status-critical/30",
    label: "text-status-critical",
  },
  out: {
    tint: "bg-status-out/[0.10]",
    ring: "ring-status-out/30",
    label: "text-status-out",
  },
};

export function CategoryTreemap({ byCategory }: Props) {
  const [mode, setMode] = useState<Mode>("treemap");

  const total = byCategory.reduce((s, c) => s + c.total, 0);

  return (
    <section className="animate-fade-in-up rounded-2xl bg-card p-6 ring-1 ring-foreground/10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-semibold tracking-tight">
            Stock por categoría
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Visualización jerárquica de volumen y estado de salud.
          </p>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {byCategory.length === 0 ? (
        <EmptyState />
      ) : mode === "treemap" ? (
        <Treemap items={byCategory} total={total} />
      ) : (
        <Bars items={byCategory} total={total} />
      )}
    </section>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg bg-background p-0.5 ring-1 ring-foreground/10">
      <button
        type="button"
        onClick={() => onChange("treemap")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-wider transition-colors",
          mode === "treemap"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <LayoutGrid className="size-3" />
        Treemap
      </button>
      <button
        type="button"
        onClick={() => onChange("bars")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-wider transition-colors",
          mode === "bars"
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <BarChart3 className="size-3" />
        Barras
      </button>
    </div>
  );
}

function Treemap({
  items,
  total,
}: {
  items: InventoryStats["byCategory"];
  total: number;
}) {
  // Bricks con flex-grow proporcional al sqrt(count) — suaviza diferencias.
  // Mantiene altura fija por fila y wrappea naturalmente.
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c, i) => {
        const grow = Math.sqrt(c.total);
        const cls = DOMINANT_CLASS[c.dominant];
        const pctHealthy = (c.counts.healthy / Math.max(1, c.total)) * 100;
        const pctLow = (c.counts.low / Math.max(1, c.total)) * 100;
        const pctCritical = (c.counts.critical / Math.max(1, c.total)) * 100;
        const pctOut = (c.counts.out / Math.max(1, c.total)) * 100;
        const sharePct = total > 0 ? Math.round((c.total / total) * 100) : 0;

        return (
          <motion.button
            key={c.category}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + i * 0.03, duration: 0.4 }}
            whileHover={{ y: -2 }}
            title={`${c.category} · ${c.total} items (${sharePct}% del total)`}
            style={{ flexGrow: grow, flexBasis: 120 }}
            className={cn(
              "group relative flex h-[120px] min-w-[120px] flex-col justify-between overflow-hidden rounded-xl p-3 text-left ring-1 transition-all hover:brightness-110",
              cls.tint,
              cls.ring,
            )}
          >
            <div className="min-w-0">
              <div
                className={cn(
                  "text-[11px] font-semibold uppercase tracking-[0.12em]",
                  cls.label,
                )}
              >
                {c.category}
              </div>
              <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                {sharePct}% del total
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/[0.06]">
                {pctHealthy > 0 && (
                  <span
                    className="h-full bg-status-healthy"
                    style={{ width: `${pctHealthy}%` }}
                  />
                )}
                {pctLow > 0 && (
                  <span
                    className="h-full bg-status-low"
                    style={{ width: `${pctLow}%` }}
                  />
                )}
                {pctCritical > 0 && (
                  <span
                    className="h-full bg-status-critical"
                    style={{ width: `${pctCritical}%` }}
                  />
                )}
                {pctOut > 0 && (
                  <span
                    className="h-full bg-status-out"
                    style={{ width: `${pctOut}%` }}
                  />
                )}
              </div>
              <span className="text-[22px] font-semibold leading-none tracking-tight tabular-nums">
                {c.total}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function Bars({
  items,
  total,
}: {
  items: InventoryStats["byCategory"];
  total: number;
}) {
  const max = Math.max(1, ...items.map((c) => c.total));
  return (
    <ul className="flex flex-col gap-2">
      {items.map((c, i) => {
        const widthPct = (c.total / max) * 100;
        const pctHealthy = (c.counts.healthy / Math.max(1, c.total)) * widthPct;
        const pctLow = (c.counts.low / Math.max(1, c.total)) * widthPct;
        const pctCritical =
          (c.counts.critical / Math.max(1, c.total)) * widthPct;
        const pctOut = (c.counts.out / Math.max(1, c.total)) * widthPct;
        const sharePct = total > 0 ? Math.round((c.total / total) * 100) : 0;
        return (
          <motion.li
            key={c.category}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.04 + i * 0.025, duration: 0.35 }}
            className="grid grid-cols-[140px_1fr_auto] items-center gap-3"
          >
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-medium">
                {c.category}
              </div>
              <div className="text-[10.5px] text-muted-foreground">
                {sharePct}%
              </div>
            </div>
            <div className="relative h-5 overflow-hidden rounded-md bg-muted/40 ring-1 ring-foreground/[0.04]">
              <div className="flex h-full">
                {pctHealthy > 0 && (
                  <span
                    className="h-full bg-status-healthy"
                    style={{ width: `${pctHealthy}%` }}
                  />
                )}
                {pctLow > 0 && (
                  <span
                    className="h-full bg-status-low"
                    style={{ width: `${pctLow}%` }}
                  />
                )}
                {pctCritical > 0 && (
                  <span
                    className="h-full bg-status-critical"
                    style={{ width: `${pctCritical}%` }}
                  />
                )}
                {pctOut > 0 && (
                  <span
                    className="h-full bg-status-out"
                    style={{ width: `${pctOut}%` }}
                  />
                )}
              </div>
            </div>
            <span className="w-8 text-right text-[13px] font-semibold tabular-nums">
              {c.total}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-background/50 px-6 py-12 text-center">
      <p className="text-[13px] text-muted-foreground">
        Importá tu inventario en la sección Inventario para ver el desglose por
        categoría.
      </p>
    </div>
  );
}
