"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Inbox,
  PackageCheck,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import {
  applyOrderToInventory,
  canTransition,
  loadOrders,
  saveOrders,
  STATUS_LABEL,
  STATUS_TONE,
  totalQty,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "../lib/orders";

type Props = {
  orders: PurchaseOrder[];
  hydrated: boolean;
  onEdit: (o: PurchaseOrder) => void;
  onCreate: () => void;
};

const STATUS_GROUPS: Array<{
  key: PurchaseOrderStatus;
  label: string;
}> = [
  { key: "draft", label: "Borradores" },
  { key: "ready", label: "Listas para enviar" },
  { key: "ordered", label: "Enviadas" },
  { key: "received", label: "Recibidas" },
  { key: "cancelled", label: "Canceladas" },
];

export function OrdersList({ orders, hydrated, onEdit, onCreate }: Props) {
  if (!hydrated) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
        <p className="text-[13px] text-muted-foreground">Cargando órdenes…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
        <Inbox className="size-6 text-muted-foreground/60" />
        <p className="mt-3 text-[14px] font-medium">Sin órdenes todavía</p>
        <p className="mt-1 max-w-md text-[12.5px] text-muted-foreground">
          Creá tu primera orden. Vas a ver sugerencias automáticas con los items
          que están bajos o críticos.
        </p>
        <Button size="sm" className="mt-4" onClick={onCreate}>
          Crear orden
        </Button>
      </div>
    );
  }

  const grouped = STATUS_GROUPS.map((g) => ({
    ...g,
    items: orders
      .filter((o) => o.status === g.key)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {grouped.map((g, gi) => (
        <section key={g.key}>
          <h3 className="mb-2 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", STATUS_TONE[g.key].dot)} />
            {g.label}
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-semibold text-foreground tabular-nums">
              {g.items.length}
            </span>
          </h3>
          <ul className="flex flex-col gap-2">
            {g.items.map((order, i) => (
              <OrderCard
                key={order.id}
                order={order}
                delay={gi * 60 + i * 30}
                onEdit={onEdit}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function OrderCard({
  order,
  delay,
  onEdit,
}: {
  order: PurchaseOrder;
  delay: number;
  onEdit: (o: PurchaseOrder) => void;
}) {
  const [expanded, setExpanded] = useState(order.status === "ordered");
  const tone = STATUS_TONE[order.status];
  const total = totalQty(order);
  const lineCount = order.lines.length;
  const newItemsCount = order.lines.filter((l) => l.isNew).length;

  const updateStatus = (next: PurchaseOrderStatus) => {
    if (!canTransition(order.status, next)) return;
    const existing = loadOrders();
    const now = new Date();

    if (next === "received") {
      // Aplicar al inventario antes de persistir el cambio de estado
      const res = applyOrderToInventory(order);
      const updatedOrders = existing.map((o) =>
        o.id === order.id
          ? { ...o, status: next, updatedAt: now, receivedAt: now }
          : o,
      );
      saveOrders(updatedOrders);
      toast.success("Orden recibida e ingresada al inventario", {
        description: `${res.updated} actualizados${res.created > 0 ? ` · ${res.created} nuevos creados` : ""}`,
      });
      return;
    }

    const updatedOrders = existing.map((o) =>
      o.id === order.id
        ? {
            ...o,
            status: next,
            updatedAt: now,
            orderedAt: next === "ordered" ? now : o.orderedAt,
          }
        : o,
    );
    saveOrders(updatedOrders);
    toast.success(`Orden ${STATUS_LABEL[next].toLowerCase()}`, {
      description: order.reference,
    });
  };

  const handleDelete = () => {
    const existing = loadOrders();
    const next = existing.filter((o) => o.id !== order.id);
    saveOrders(next);
    toast(`${order.reference} eliminada`, {
      action: {
        label: "Deshacer",
        onClick: () => saveOrders([order, ...next]),
      },
    });
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.35 }}
      className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/20"
    >
      <div className="grid grid-cols-[1fr_auto] items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider ring-1",
              tone.bg,
              tone.text,
              tone.ring,
            )}
          >
            <span className={cn("size-1.5 rounded-full", tone.dot)} />
            {STATUS_LABEL[order.status]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[13px] font-semibold tracking-wide">
                {order.reference}
              </span>
              <span className="text-[11.5px] text-muted-foreground">
                actualizada {formatRelative(order.updatedAt)}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              {lineCount} {lineCount === 1 ? "ítem" : "ítems"} · {total}{" "}
              unidades
              {newItemsCount > 0 && (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-primary">
                    {newItemsCount} nuevo{newItemsCount === 1 ? "" : "s"}
                  </span>
                </>
              )}
              {order.note && <> · {order.note}</>}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {order.status === "draft" && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => updateStatus("ready")}
              title="Marcar lista"
            >
              <Check className="size-3" /> Lista
            </Button>
          )}
          {order.status === "ready" && (
            <Button
              size="xs"
              onClick={() => updateStatus("ordered")}
              title="Marcar enviada"
            >
              <Send className="size-3" /> Enviada
            </Button>
          )}
          {order.status === "ordered" && (
            <Button
              size="xs"
              onClick={() => updateStatus("received")}
              className="bg-status-healthy text-white hover:brightness-110"
              title="Marcar recibida"
            >
              <PackageCheck className="size-3" /> Recibida
            </Button>
          )}
          {(order.status === "draft" || order.status === "ready") && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onEdit(order)}
              title="Editar"
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
          {(order.status === "draft" ||
            order.status === "ready" ||
            order.status === "ordered") && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => updateStatus("cancelled")}
              title="Cancelar"
              className="text-muted-foreground hover:bg-status-critical/15 hover:text-status-critical"
            >
              <X className="size-3.5" />
            </Button>
          )}
          {order.status !== "received" && order.status !== "cancelled" && null}
          {(order.status === "received" || order.status === "cancelled") && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={handleDelete}
              title="Eliminar"
              className="text-muted-foreground hover:bg-status-critical/15 hover:text-status-critical"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border/60"
          >
            <ul className="divide-y divide-border/40 px-4 py-2">
              {order.lines.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-3 py-2 text-[12.5px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{l.name}</span>
                      {l.isNew && (
                        <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-primary">
                          nuevo
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {l.brand || "—"} · {l.category}
                    </div>
                  </div>
                  <span className="font-mono text-[13px] font-semibold tabular-nums">
                    × {l.qty}
                  </span>
                </li>
              ))}
            </ul>
            {order.note && (
              <div className="border-t border-border/40 bg-muted/30 px-4 py-2 text-[11.5px] text-muted-foreground">
                <span className="font-semibold uppercase tracking-wider text-foreground/80">
                  Nota:
                </span>{" "}
                {order.note}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
