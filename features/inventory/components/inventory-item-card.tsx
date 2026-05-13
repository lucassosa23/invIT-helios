"use client";

import { MapPin, Minus, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";

import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Asset, Location, Status } from "@/lib/fake-data";

const STATUS_STRIPE: Record<Status, string> = {
  healthy: "bg-status-healthy",
  low: "bg-status-low",
  critical: "bg-status-critical",
  out: "bg-status-out",
};

const STATUS_TINT: Record<Status, string> = {
  healthy: "from-status-healthy/[0.045] to-transparent",
  low: "from-status-low/[0.07] to-transparent",
  critical: "from-status-critical/[0.08] to-transparent",
  out: "from-status-out/[0.08] to-transparent",
};

const STATUS_QTY_COLOR: Record<Status, string> = {
  healthy: "text-foreground",
  low: "text-status-low",
  critical: "text-status-critical",
  out: "text-status-out",
};

const STATUS_BADGE: Record<
  Status,
  React.ComponentProps<typeof StatusBadge>["status"]
> = {
  healthy: "healthy",
  low: "low",
  critical: "critical",
  out: "out",
};

type Props = {
  asset: Asset;
  location?: Location;
  onAdjust: (delta: number) => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function InventoryItemCard({
  asset,
  location,
  onAdjust,
  onEdit,
  onDelete,
}: Props) {
  const pct = Math.min(
    100,
    Math.round((asset.stock / Math.max(1, asset.threshold)) * 100),
  );

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 28, mass: 0.6 }}
      whileHover={{ y: -2 }}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-[box-shadow,border-color] duration-200 hover:ring-foreground/20",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-r",
          STATUS_TINT[asset.status],
        )}
      />
      <div
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          STATUS_STRIPE[asset.status],
        )}
      />

      <div className="relative grid gap-4 p-4 pl-5 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-[15.5px] font-semibold leading-tight tracking-tight">
              {asset.name}
            </h3>
            <span className="inline-flex h-5 items-center rounded-md bg-muted px-1.5 text-[10.5px] uppercase tracking-wider text-muted-foreground">
              {asset.category}
            </span>
          </div>
          <p className="mt-1 truncate text-[12px] text-muted-foreground">
            {asset.brand || "Sin marca"}{" "}
            <span className="text-muted-foreground/60">·</span>{" "}
            <span className="font-mono text-[10.5px] uppercase tracking-wider">
              {asset.sku}
            </span>
          </p>
          {location && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" />
                {location.name}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-end gap-3 sm:flex-col sm:items-end sm:gap-2">
          <div className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-[34px] font-semibold leading-none tracking-tight tabular-nums",
                STATUS_QTY_COLOR[asset.status],
              )}
            >
              {asset.stock}
            </span>
            <span className="text-[11.5px] text-muted-foreground">
              / mín. {asset.threshold}
            </span>
          </div>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
            <motion.div
              key={`${asset.id}-${pct}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, pct)}%` }}
              transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
              className={cn("h-full rounded-full", STATUS_STRIPE[asset.status])}
            />
          </div>
          <StatusBadge status={STATUS_BADGE[asset.status]} withDot={false} />
        </div>

        <div className="flex items-center gap-1 sm:flex-col">
          <div className="flex items-center gap-1 rounded-lg bg-muted/40 p-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Quitar uno"
              onClick={() => onAdjust(-1)}
              disabled={asset.stock === 0}
              className="hover:bg-status-critical/15 hover:text-status-critical disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Sumar uno"
              onClick={() => onAdjust(1)}
              className="hover:bg-status-healthy/15 hover:text-status-healthy"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Editar item"
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Más acciones"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <MoreVertical className="size-3.5" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" sideOffset={6} className="w-40">
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="text-muted-foreground" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={onDelete}>
                  <Trash2 />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.li>
  );
}
