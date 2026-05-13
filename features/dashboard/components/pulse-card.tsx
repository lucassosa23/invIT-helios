"use client";

import { AlertOctagon, AlertTriangle, CheckCircle2, PackageX } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import type { InventoryStats } from "../lib/use-inventory-stats";

type Props = { stats: InventoryStats };

export function PulseCard({ stats }: Props) {
  const { counts, total, healthPct, trend } = stats;

  // Segmentos del donut en grados (verde / ámbar / rojo / gris)
  const safeTotal = Math.max(1, total);
  const degHealthy = (counts.healthy / safeTotal) * 360;
  const degLow = (counts.low / safeTotal) * 360;
  const degCritical = (counts.critical / safeTotal) * 360;

  const stops = (() => {
    const a = degHealthy;
    const b = a + degLow;
    const c = b + degCritical;
    return {
      healthy: { from: 0, to: a },
      low: { from: a, to: b },
      critical: { from: b, to: c },
      out: { from: c, to: 360 },
    };
  })();

  const donutBg =
    total === 0
      ? "conic-gradient(var(--muted) 0deg, var(--muted) 360deg)"
      : `conic-gradient(
          var(--status-healthy) ${stops.healthy.from}deg ${stops.healthy.to}deg,
          var(--status-low) ${stops.low.from}deg ${stops.low.to}deg,
          var(--status-critical) ${stops.critical.from}deg ${stops.critical.to}deg,
          var(--status-out) ${stops.out.from}deg ${stops.out.to}deg
        )`;

  const trendMax = Math.max(1, ...trend);

  const tiles = [
    {
      key: "healthy",
      label: "Disponible",
      value: counts.healthy,
      icon: CheckCircle2,
      tone: "healthy" as const,
    },
    {
      key: "low",
      label: "Bajo umbral",
      value: counts.low,
      icon: AlertTriangle,
      tone: "low" as const,
    },
    {
      key: "critical",
      label: "Crítico",
      value: counts.critical,
      icon: AlertOctagon,
      tone: "critical" as const,
      badge: counts.critical > 0 ? "acción" : undefined,
    },
    {
      key: "out",
      label: "Agotado",
      value: counts.out,
      icon: PackageX,
      tone: "out" as const,
    },
  ];

  return (
    <section
      className="animate-fade-in-up rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
      style={{ animationDelay: "0ms" }}
    >
      <div className="flex flex-col items-stretch gap-6 md:flex-row md:gap-8">
        {/* Donut + sparkline */}
        <div className="flex shrink-0 flex-col items-center gap-4">
          <div className="relative grid size-[190px] place-items-center sm:size-[220px] lg:size-[240px]">
            <motion.div
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="size-full rounded-full p-[16px] sm:p-[18px]"
              style={{ background: donutBg }}
            >
              <div className="grid size-full place-items-center rounded-full bg-card">
                <div className="text-center">
                  <div className="text-[36px] font-semibold leading-none tracking-tight tabular-nums sm:text-[40px] lg:text-[44px]">
                    {healthPct}%
                  </div>
                  <div className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Saludable
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex w-full flex-col items-center">
            <div className="flex h-8 w-40 items-end justify-between gap-[3px] sm:w-44">
              {trend.map((v, i) => {
                const h = Math.max(8, Math.round((v / trendMax) * 100));
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: `${h}%`, opacity: 1 }}
                    transition={{
                      delay: 0.4 + i * 0.05,
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex-1 rounded-t-[2px] bg-primary"
                    style={{
                      opacity: 0.25 + (i / (trend.length - 1)) * 0.75,
                    }}
                  />
                );
              })}
            </div>
            <span className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Tendencia 7 días
            </span>
          </div>
        </div>

        {/* Header + grid de 4 mini cards */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:gap-5">
          <div>
            <h2 className="text-[19px] font-semibold tracking-tight sm:text-[22px]">
              Pulso del inventario
            </h2>
            <p className="mt-1 text-[12.5px] text-muted-foreground sm:text-[13px]">
              Estado operativo global.{" "}
              {total === 0
                ? "Importá tu Excel para arrancar."
                : `${total} items en seguimiento.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            {tiles.map((t, i) => {
              const { key, ...rest } = t;
              return <PulseTile key={key} delay={120 + i * 60} {...rest} />;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

type Tone = "healthy" | "low" | "critical" | "out";

const TONE_CLASSES: Record<
  Tone,
  { iconBg: string; iconText: string; numText: string }
> = {
  healthy: {
    iconBg: "bg-status-healthy-soft",
    iconText: "text-status-healthy",
    numText: "text-foreground",
  },
  low: {
    iconBg: "bg-status-low-soft",
    iconText: "text-status-low",
    numText: "text-foreground",
  },
  critical: {
    iconBg: "bg-status-critical-soft",
    iconText: "text-status-critical",
    numText: "text-status-critical",
  },
  out: {
    iconBg: "bg-status-out-soft",
    iconText: "text-status-out",
    numText: "text-muted-foreground",
  },
};

function PulseTile({
  label,
  value,
  icon: Icon,
  tone,
  badge,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tone: Tone;
  badge?: string;
  delay: number;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.4 }}
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-xl bg-background p-4 ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/20"
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "grid size-9 place-items-center rounded-lg ring-1 ring-foreground/[0.04]",
            t.iconBg,
          )}
        >
          <Icon className={cn("size-4.5", t.iconText)} strokeWidth={2.2} />
        </div>
        {badge && (
          <span className="rounded-full bg-status-critical/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-status-critical ring-1 ring-status-critical/30">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={cn(
            "text-[30px] font-semibold leading-none tracking-tight tabular-nums",
            t.numText,
          )}
        >
          {value}
        </span>
      </div>
      <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
    </motion.div>
  );
}
