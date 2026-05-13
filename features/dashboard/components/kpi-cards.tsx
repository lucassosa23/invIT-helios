"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Inbox,
  ShieldCheck,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { loadInventory, subscribeInventory } from "@/lib/storage";

type KpiTone = "critical" | "info" | "healthy" | "low";

type KpiKey =
  | "stockCritical"
  | "pendingProcurement"
  | "activeRequests"
  | "warrantyExpiring";

type KpiConfig = {
  key: KpiKey;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: KpiTone;
  href: string;
};

export type KpiValues = Record<KpiKey, number>;

const TONE: Record<
  KpiTone,
  { iconBg: string; iconColor: string; ring: string }
> = {
  critical: {
    iconBg: "bg-status-critical-soft",
    iconColor: "text-status-critical",
    ring: "ring-status-critical/25",
  },
  low: {
    iconBg: "bg-status-low-soft",
    iconColor: "text-status-low",
    ring: "ring-status-low/25",
  },
  info: {
    iconBg: "bg-status-info-soft",
    iconColor: "text-status-info",
    ring: "ring-status-info/25",
  },
  healthy: {
    iconBg: "bg-status-healthy-soft",
    iconColor: "text-status-healthy",
    ring: "ring-status-healthy/25",
  },
};

const KPIS: KpiConfig[] = [
  {
    key: "stockCritical",
    label: "Stock crítico",
    hint: "items que necesitan reposición",
    icon: AlertTriangle,
    tone: "critical",
    href: "/inventory?filter=critical",
  },
  {
    key: "pendingProcurement",
    label: "Compras pendientes",
    hint: "para revisar o enviar",
    icon: ShoppingBag,
    tone: "info",
    href: "/procurement",
  },
  {
    key: "activeRequests",
    label: "Pedidos abiertos",
    hint: "esperando respuesta",
    icon: Inbox,
    tone: "low",
    href: "/requests",
  },
  {
    key: "warrantyExpiring",
    label: "Garantías por vencer",
    hint: "en los próximos 90 días",
    icon: ShieldCheck,
    tone: "healthy",
    href: "/inventory?filter=warranty",
  },
];

export function KpiCards({ seed }: { seed: KpiValues }) {
  const [overrides, setOverrides] = useState<{
    stockCritical: number;
    warrantyExpiring: number;
  } | null>(null);

  useEffect(() => {
    const compute = () => {
      const stored = loadInventory();
      if (!stored) {
        setOverrides(null);
        return;
      }
      const stockCritical = stored.filter(
        (a) => a.status === "critical" || a.status === "out",
      ).length;
      const ninetyDays = Date.now() + 90 * 24 * 3600 * 1000;
      const warrantyExpiring = stored.filter((a) => {
        const t = a.warrantyExpiresAt.getTime();
        return t > Date.now() && t < ninetyDays;
      }).length;
      setOverrides({ stockCritical, warrantyExpiring });
    };
    compute();
    return subscribeInventory(compute);
  }, []);

  const values = useMemo<KpiValues>(
    () =>
      overrides
        ? { ...seed, ...overrides }
        : seed,
    [seed, overrides],
  );

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {KPIS.map((c, i) => {
        const tone = TONE[c.tone];
        const Icon = c.icon;
        const value = values[c.key];
        return (
          <a
            key={c.key}
            href={c.href}
            className="block focus-visible:outline-none"
          >
            <Card
              className="card-elevated animate-fade-in-up group h-full p-5 transition-all duration-200 hover:-translate-y-0.5 hover:ring-foreground/15"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-lg ring-1 transition-transform duration-200 group-hover:scale-105",
                    tone.iconBg,
                    tone.ring,
                  )}
                >
                  <Icon className={cn("size-5", tone.iconColor)} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {c.label}
                  </div>
                  <div className="mt-1 text-[30px] font-semibold leading-tight tracking-tight tabular-nums">
                    {formatNumber(value)}
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    {c.hint}
                  </p>
                </div>
              </div>
            </Card>
          </a>
        );
      })}
    </div>
  );
}
