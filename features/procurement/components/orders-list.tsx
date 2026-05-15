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
  Truck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import {
  canTransition,
  STATUS_LABEL,
  STATUS_TONE,
  totalPending,
  totalQty,
  totalReceived,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "../lib/orders";
import {
  createOrderAction,
  deleteOrderAction,
  transitionOrderStatusAction,
} from "../lib/actions";
import {
  cascadeRequestsOnOrderCancelled,
} from "@/features/requests/lib/requests";
import { ReceiveOrderDialog } from "./receive-order-dialog";

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
  { key: "received_partial", label: "Recibidas parciales" },
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

  const [receiveOpen, setReceiveOpen] = useState(false);

  const updateStatus = async (next: PurchaseOrderStatus) => {
    if (!canTransition(order.status, next)) return;
    // "received" / "received_partial" salen siempre del dialog de recepción.
    if (next === "received" || next === "received_partial") return;

    try {
      await transitionOrderStatusAction(order.id, next);
      if (next === "cancelled") {
        const reverted = cascadeRequestsOnOrderCancelled(order.id);
        if (reverted > 0) {
          toast.warning(
            `${reverted} pedido${reverted === 1 ? "" : "s"} volvieron a pendiente`,
            { description: "La orden vinculada fue cancelada." },
          );
        }
      }
      toast.success(`Orden ${STATUS_LABEL[next].toLowerCase()}`, {
        description: order.reference,
      });
    } catch (err) {
      console.error(err);
      toast.error("No se pudo cambiar el estado");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteOrderAction(order.id);
      cascadeRequestsOnOrderCancelled(order.id);
      toast(`${order.reference} eliminada`, {
        action: {
          label: "Deshacer",
          onClick: async () => {
            try {
              await createOrderAction({
                lines: order.lines.map((l) => ({
                  assetId: l.assetId ?? null,
                  name: l.name,
                  brand: l.brand,
                  category: l.category,
                  isNew: l.isNew,
                  qty: l.qty,
                })),
                note: order.note ?? "",
                status: order.status,
                monthYear: null,
              });
            } catch (err) {
              console.error(err);
              toast.error("No se pudo restaurar");
            }
          },
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("No se pudo eliminar la orden");
    }
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
          {(order.status === "ordered" || order.status === "received_partial") && (
            <Button
              size="xs"
              onClick={() => setReceiveOpen(true)}
              className="bg-status-healthy text-white hover:brightness-110"
              title="Confirmar recepción"
            >
              <PackageCheck className="size-3" />
              {order.status === "received_partial"
                ? "Recibir el resto"
                : "Lo recibí"}
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
          {(order.status === "draft" || order.status === "ready") && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={handleDelete}
              title="Eliminar orden"
              className="text-muted-foreground hover:bg-status-critical/15 hover:text-status-critical"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
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
            <OrderStepper status={order.status} />

            {order.status === "ordered" && (
              <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg bg-status-low-soft/60 px-4 py-3 ring-1 ring-status-low/25">
                <Truck className="size-5 shrink-0 text-status-low" />
                <div className="min-w-0 flex-1 text-[12.5px]">
                  <span className="font-semibold text-status-low">
                    Esperando entrega
                  </span>{" "}
                  <span className="text-muted-foreground">
                    · confirmá cuando llegue para sumar al stock.
                  </span>
                </div>
                <Button
                  size="xs"
                  onClick={() => setReceiveOpen(true)}
                  className="bg-status-healthy text-white hover:brightness-110"
                >
                  <PackageCheck className="size-3" />
                  Lo recibí
                </Button>
              </div>
            )}

            {order.status === "received_partial" && (
              <div className="mx-4 mt-3 flex items-center gap-3 rounded-lg bg-status-info-soft/60 px-4 py-3 ring-1 ring-status-info/25">
                <PackageCheck className="size-5 shrink-0 text-status-info" />
                <div className="min-w-0 flex-1 text-[12.5px]">
                  <span className="font-semibold text-status-info">
                    Recibida parcial
                  </span>{" "}
                  <span className="text-muted-foreground">
                    · {totalReceived(order)} de {total} unidades recibidas ·{" "}
                    faltan {totalPending(order)}.
                  </span>
                </div>
                <Button
                  size="xs"
                  onClick={() => setReceiveOpen(true)}
                  className="bg-status-healthy text-white hover:brightness-110"
                >
                  <PackageCheck className="size-3" />
                  Recibir el resto
                </Button>
              </div>
            )}

            <ul className="divide-y divide-border/40 px-4 py-2">
              {order.lines.map((l) => {
                const received = l.receivedQty ?? 0;
                const pending = Math.max(0, l.qty - received);
                const fullyReceived = pending === 0 && received > 0;
                const partial = received > 0 && pending > 0;
                return (
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
                        {fullyReceived && (
                          <span className="shrink-0 rounded-full bg-status-healthy-soft px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-status-healthy">
                            ✓ recibido
                          </span>
                        )}
                        {partial && (
                          <span className="shrink-0 rounded-full bg-status-low-soft px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-status-low">
                            parcial
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {l.brand || "—"} · {l.category}
                      </div>
                    </div>
                    <span className="font-mono text-[13px] font-semibold tabular-nums">
                      {received > 0 ? (
                        <>
                          <span className="text-status-healthy">
                            {received}
                          </span>
                          <span className="text-muted-foreground">
                            {" / "}
                            {l.qty}
                          </span>
                        </>
                      ) : (
                        <span>× {l.qty}</span>
                      )}
                    </span>
                  </li>
                );
              })}
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

      <ReceiveOrderDialog
        order={order}
        open={receiveOpen}
        onOpenChange={setReceiveOpen}
      />
    </motion.li>
  );
}

function OrderStepper({ status }: { status: PurchaseOrderStatus }) {
  const steps: {
    key: PurchaseOrderStatus;
    label: string;
  }[] = [
    { key: "draft", label: "Borrador" },
    { key: "ready", label: "Lista" },
    { key: "ordered", label: "Enviada" },
    { key: "received", label: "Recibida" },
  ];

  // Determinar el index "activo"
  let activeIdx = steps.findIndex((s) => s.key === status);
  if (status === "received_partial") activeIdx = 2; // entre Enviada y Recibida
  if (status === "cancelled") activeIdx = -1;

  return (
    <div className="flex items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-3">
      {steps.map((step, i) => {
        const done = activeIdx >= 0 && i < activeIdx;
        const current = activeIdx >= 0 && i === activeIdx;
        const isPartial = status === "received_partial" && i === 2;
        return (
          <div key={step.key} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-[10.5px] font-bold tabular-nums ring-1 transition-colors",
                done && "bg-status-healthy text-white ring-status-healthy",
                current &&
                  !isPartial &&
                  "bg-primary text-primary-foreground ring-primary/60",
                isPartial && "bg-status-low text-white ring-status-low/60",
                !done &&
                  !current &&
                  "bg-card text-muted-foreground ring-foreground/15",
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "truncate text-[11.5px] font-semibold uppercase tracking-[0.08em]",
                done && "text-status-healthy",
                current && !isPartial && "text-primary",
                isPartial && "text-status-low",
                !done && !current && "text-muted-foreground",
              )}
            >
              {isPartial ? "Parcial" : step.label}
            </span>
            {i < steps.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  done ? "bg-status-healthy/60" : "bg-border/60",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
