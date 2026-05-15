"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Bell,
  BellOff,
  CheckCheck,
  ChevronDown,
  PackageX,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Asset } from "@/lib/fake-data";
import { cn } from "@/lib/utils";

import {
  dismissAll,
  markAllRead,
  markRead,
  type NotifKind,
  type StockNotif,
} from "../lib/notifications";
import { useNotifications } from "../lib/use-notifications";

const PREVIEW_LIMIT = 5;

const KIND_META: Record<
  NotifKind,
  {
    label: string;
    icon: React.ElementType;
    tone: string;
    dot: string;
  }
> = {
  stock_out: {
    label: "Agotado",
    icon: PackageX,
    tone: "text-status-out",
    dot: "bg-status-out",
  },
  stock_critical: {
    label: "Crítico",
    icon: AlertOctagon,
    tone: "text-status-critical",
    dot: "bg-status-critical",
  },
  stock_low: {
    label: "Bajo",
    icon: AlertTriangle,
    tone: "text-status-low",
    dot: "bg-status-low",
  },
};

function buildHref(notif: StockNotif): string {
  const filter =
    notif.kind === "stock_low"
      ? "low"
      : notif.kind === "stock_critical"
        ? "critical"
        : "critical";
  const q = encodeURIComponent(notif.asset.name);
  return `/inventory?q=${q}&filter=${filter}`;
}

export function NotificationsBell({ assets }: { assets: Asset[] }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { visible, readIds } = useNotifications(assets);
  const unread = visible.filter((n) => !readIds.has(n.id)).length;

  const shown = expanded ? visible : visible.slice(0, PREVIEW_LIMIT);
  const hidden = Math.max(0, visible.length - shown.length);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    // Resetear paginación al cerrar para que la próxima apertura
    // vuelva a mostrar solo el preview corto.
    if (!next) setExpanded(false);
  };

  const handleItemClick = (id: string) => {
    markRead([id]);
    setOpen(false);
    setExpanded(false);
  };

  const handleClearAll = () => {
    dismissAll(visible);
    setExpanded(false);
  };

  const handleMarkAllRead = () => {
    markAllRead(visible);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={
              unread > 0
                ? `Notificaciones (${unread} sin leer)`
                : "Notificaciones"
            }
            className="relative inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Bell className="size-4" />
            {unread > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-status-critical px-1 text-[9.5px] font-bold tabular-nums text-white ring-2 ring-background"
                aria-hidden
              >
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] gap-0 overflow-hidden p-0 sm:w-[400px]"
      >
        <header className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-[13.5px] font-semibold tracking-tight">
              Notificaciones
            </span>
            <span className="text-[11.5px] text-muted-foreground">
              {visible.length === 0
                ? "Sin alertas activas"
                : `${visible.length} ${visible.length === 1 ? "alerta" : "alertas"} de stock${
                    unread > 0 ? ` · ${unread} sin leer` : ""
                  }`}
            </span>
          </div>
          {visible.length > 0 && (
            <div className="flex shrink-0 items-center gap-0.5">
              {unread > 0 && (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={handleMarkAllRead}
                  className="text-muted-foreground hover:text-foreground"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="size-3.5" />
                </Button>
              )}
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-status-critical"
                title="Limpiar todas"
              >
                <Trash2 className="size-3.5" />
                Limpiar
              </Button>
            </div>
          )}
        </header>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="grid size-10 place-items-center rounded-full bg-muted/60 text-muted-foreground ring-1 ring-foreground/5">
              <BellOff className="size-4" />
            </span>
            <p className="text-[12.5px] font-medium text-foreground/80">
              Todo en orden
            </p>
            <p className="max-w-[28ch] text-[11.5px] text-muted-foreground">
              No hay items bajo umbral. Las alertas aparecen acá cuando el
              stock cae.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <ul className="divide-y divide-border/50">
              {shown.map((n) => {
                const meta = KIND_META[n.kind];
                const Icon = meta.icon;
                const isRead = readIds.has(n.id);
                const stock = n.asset.stock;
                const threshold = n.asset.threshold;
                const missing = Math.max(0, threshold - stock);
                return (
                  <li key={n.id}>
                    <Link
                      href={buildHref(n)}
                      onClick={() => handleItemClick(n.id)}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40",
                        !isRead && "bg-muted/15",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-md ring-1",
                          n.kind === "stock_out"
                            ? "bg-muted/60 text-muted-foreground ring-foreground/10"
                            : n.kind === "stock_critical"
                              ? "bg-status-critical-soft text-status-critical ring-status-critical/20"
                              : "bg-status-low-soft text-status-low ring-status-low/20",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "text-[10.5px] font-semibold uppercase tracking-wider",
                              meta.tone,
                            )}
                          >
                            {meta.label}
                          </span>
                          {!isRead && (
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                meta.dot,
                              )}
                              aria-hidden
                            />
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[13px] font-medium leading-tight">
                          {n.asset.name}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                          Stock <span className="tabular-nums">{stock}</span> /
                          mín. <span className="tabular-nums">{threshold}</span>
                          {missing > 0 && (
                            <span className="text-foreground/70">
                              {" · "}faltan{" "}
                              <span className="font-semibold tabular-nums">
                                {missing}
                              </span>
                            </span>
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {hidden > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="flex w-full items-center justify-center gap-1.5 border-t border-border/50 px-4 py-2.5 text-[11.5px] font-semibold text-primary transition-colors hover:bg-muted/40"
              >
                <ChevronDown className="size-3.5" />
                Ver {hidden} más
              </button>
            )}
          </ScrollArea>
        )}

        <footer className="flex items-center justify-between gap-2 border-t border-border/70 bg-muted/30 px-3 py-2.5">
          <Link
            href="/settings/notifications"
            onClick={() => setOpen(false)}
            className="text-[11.5px] text-muted-foreground hover:text-foreground"
          >
            Configurar
          </Link>
          <Link
            href="/inventory?filter=critical"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-primary hover:text-primary/80"
          >
            Ver inventario
            <ArrowRight className="size-3" />
          </Link>
        </footer>
      </PopoverContent>
    </Popover>
  );
}
