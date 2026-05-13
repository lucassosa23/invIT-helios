"use client";

import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Inbox,
  PackageCheck,
  ShieldAlert,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import type { ActivityEvent, ActivityEventKind } from "@/lib/fake-data";
import { formatRelative } from "@/lib/format";

type Tone = "healthy" | "low" | "critical" | "info" | "primary";

const KIND_META: Record<
  ActivityEventKind,
  { icon: LucideIcon; tone: Tone }
> = {
  "stock.added": { icon: ArrowUpRight, tone: "healthy" },
  "stock.removed": { icon: ArrowDownLeft, tone: "info" },
  "stock.alert": { icon: AlertTriangle, tone: "low" },
  "procurement.queued": { icon: ShoppingBag, tone: "info" },
  "procurement.ordered": { icon: ShoppingBag, tone: "primary" },
  "procurement.received": { icon: PackageCheck, tone: "healthy" },
  "request.created": { icon: Inbox, tone: "info" },
  "request.approved": { icon: Inbox, tone: "healthy" },
  "request.delivered": { icon: PackageCheck, tone: "healthy" },
  "warranty.alert": { icon: ShieldAlert, tone: "critical" },
};

const TONE: Record<Tone, { iconBg: string; iconText: string }> = {
  healthy: {
    iconBg: "bg-status-healthy-soft",
    iconText: "text-status-healthy",
  },
  low: { iconBg: "bg-status-low-soft", iconText: "text-status-low" },
  critical: {
    iconBg: "bg-status-critical-soft",
    iconText: "text-status-critical",
  },
  info: { iconBg: "bg-status-info-soft", iconText: "text-status-info" },
  primary: { iconBg: "bg-primary/15", iconText: "text-primary" },
};

export function RecentActivity({ events }: { events: ActivityEvent[] }) {
  return (
    <section className="animate-fade-in-up rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
      <header className="mb-3 flex items-center gap-2">
        <History className="size-4 text-muted-foreground" />
        <h2 className="text-[16px] font-semibold tracking-tight">
          Actividad reciente
        </h2>
      </header>

      <ul className="flex flex-col">
        {events.slice(0, 6).map((evt, idx) => {
          const meta = KIND_META[evt.kind];
          const Icon = meta.icon;
          const t = TONE[meta.tone];
          return (
            <motion.li
              key={evt.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.3 }}
              className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-background/60"
            >
              <div
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full ring-1 ring-foreground/[0.04] transition-transform group-hover:scale-105",
                  t.iconBg,
                )}
              >
                <Icon className={cn("size-4", t.iconText)} strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] leading-5">
                  <span className="font-semibold text-foreground">
                    {evt.actor}
                  </span>{" "}
                  <span className="text-muted-foreground">{evt.summary}</span>
                </p>
                {evt.meta && (
                  <p className="truncate text-[11px] text-muted-foreground/80">
                    {evt.meta}
                  </p>
                )}
              </div>
              <time
                dateTime={evt.at.toISOString()}
                className="shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground"
                title={evt.at.toLocaleString()}
              >
                {formatRelative(evt.at)}
              </time>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
