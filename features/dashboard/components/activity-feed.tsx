import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Inbox,
  PackageCheck,
  ShoppingBag,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

import type { ActivityEvent, ActivityEventKind } from "@/lib/fake-data";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND_META: Record<
  ActivityEventKind,
  { icon: LucideIcon; tone: string; iconBg: string }
> = {
  "stock.added": {
    icon: ArrowUpRight,
    tone: "text-status-healthy",
    iconBg: "bg-status-healthy-soft",
  },
  "stock.removed": {
    icon: ArrowDownLeft,
    tone: "text-status-info",
    iconBg: "bg-status-info-soft",
  },
  "stock.alert": {
    icon: AlertTriangle,
    tone: "text-status-low",
    iconBg: "bg-status-low-soft",
  },
  "procurement.queued": {
    icon: ShoppingBag,
    tone: "text-status-info",
    iconBg: "bg-status-info-soft",
  },
  "procurement.ordered": {
    icon: ShoppingBag,
    tone: "text-primary",
    iconBg: "bg-primary/15",
  },
  "procurement.received": {
    icon: PackageCheck,
    tone: "text-status-healthy",
    iconBg: "bg-status-healthy-soft",
  },
  "request.created": {
    icon: Inbox,
    tone: "text-status-info",
    iconBg: "bg-status-info-soft",
  },
  "request.approved": {
    icon: Inbox,
    tone: "text-status-healthy",
    iconBg: "bg-status-healthy-soft",
  },
  "request.delivered": {
    icon: PackageCheck,
    tone: "text-status-healthy",
    iconBg: "bg-status-healthy-soft",
  },
  "warranty.alert": {
    icon: ShieldAlert,
    tone: "text-status-critical",
    iconBg: "bg-status-critical-soft",
  },
};

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="relative pl-3">
      <span
        aria-hidden
        className="absolute left-[10px] top-3 bottom-3 w-px bg-gradient-to-b from-border via-border to-transparent"
      />
      {events.map((evt, idx) => {
        const meta = KIND_META[evt.kind];
        const Icon = meta.icon;
        return (
          <li
            key={evt.id}
            className={cn(
              "animate-fade-in-up relative flex gap-3",
              idx > 0 && "pt-3",
            )}
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <div
              className={cn(
                "relative z-10 grid size-5 shrink-0 place-items-center rounded-full ring-4 ring-background",
                meta.iconBg,
              )}
            >
              <Icon className={cn("size-3", meta.tone)} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[13px] leading-5">
                  <span className="font-medium text-foreground">
                    {evt.actor}
                  </span>{" "}
                  <span className="text-muted-foreground">·</span>{" "}
                  <span className="text-foreground/85">{evt.summary}</span>
                </p>
                <time
                  dateTime={evt.at.toISOString()}
                  className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
                  title={evt.at.toLocaleString()}
                >
                  {formatRelative(evt.at)}
                </time>
              </div>
              {evt.meta && (
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                  {evt.meta}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
