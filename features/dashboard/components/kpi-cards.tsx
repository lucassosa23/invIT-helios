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

type KpiTone = "critical" | "info" | "healthy" | "low";

type KpiKey =
  | "stockCritical"
  | "pendingProcurement"
  | "activeRequests"
  | "warrantyExpiring";

type KpiConfig = {
  key: KpiKey;
  label: string;
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
    icon: AlertTriangle,
    tone: "critical",
    href: "/inventory?filter=critical",
  },
  {
    key: "pendingProcurement",
    label: "Compras pendientes",
    icon: ShoppingBag,
    tone: "info",
    href: "/procurement",
  },
  {
    key: "activeRequests",
    label: "Pedidos abiertos",
    icon: Inbox,
    tone: "low",
    href: "/requests",
  },
  {
    key: "warrantyExpiring",
    label: "Garantías por vencer",
    icon: ShieldCheck,
    tone: "healthy",
    href: "/inventory?filter=warranty",
  },
];

export function KpiCards({ values }: { values: KpiValues }) {
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
                  <div className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {c.label}
                  </div>
                  <div className="mt-2 text-[32px] font-semibold leading-none tracking-tight tabular-nums">
                    {formatNumber(value)}
                  </div>
                </div>
              </div>
            </Card>
          </a>
        );
      })}
    </div>
  );
}
