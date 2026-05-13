"use client";

import Link from "next/link";
import { ArrowRight, MapPin, PackagePlus, PackageX } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import type { Asset, Location } from "@/lib/fake-data";

type Props = {
  items: Asset[];
  locations: Location[];
};

export function LiveAlerts({ items, locations }: Props) {
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l]));

  return (
    <section className="animate-fade-in-up flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[16px] font-semibold tracking-tight">
            Alertas en vivo
          </h2>
          <span className="relative inline-flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-status-critical/70" />
            <span className="relative inline-block size-2 rounded-full bg-status-critical" />
          </span>
        </div>
        <Link
          href="/inventory?filter=critical"
          className="inline-flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-wider text-primary hover:text-primary/80"
        >
          Ver todas <ArrowRight className="size-3" />
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-border p-8 text-center">
          <PackageX className="size-5 text-muted-foreground/60" />
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            Sin alertas. Todo el stock está dentro del umbral.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((a, i) => {
            const max = Math.max(1, a.threshold);
            const pct = Math.min(100, Math.round((a.stock / max) * 100));
            const isOut = a.stock === 0;
            const barColor = isOut
              ? "bg-status-out"
              : a.stock <= max * 0.4
                ? "bg-status-critical"
                : "bg-status-low";
            const tone = isOut
              ? "text-status-out"
              : "text-status-critical";
            return (
              <motion.li
                key={a.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className="group flex items-center gap-3 rounded-xl bg-background/60 p-3 ring-1 ring-foreground/[0.04] transition-all hover:bg-background hover:ring-foreground/15"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold">
                      {a.name}
                    </span>
                    {locationMap[a.locationId] && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <MapPin className="size-2.5" />
                        {locationMap[a.locationId]!.name.replace(
                          "Sede Central — ",
                          "",
                        )}
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted/60">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(2, pct)}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className={cn("h-full rounded-full", barColor)}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider">
                    <span className={tone}>
                      {isOut ? "Agotado" : `${a.stock} restan`}
                    </span>
                    <span className="text-muted-foreground">
                      Mín. {a.threshold}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  title="Sumar al stock"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-primary transition-colors hover:bg-primary/15"
                >
                  <PackagePlus className="size-4" />
                </button>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
