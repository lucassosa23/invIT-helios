"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  PackageCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";

import {
  isMonthlyPlan,
  STATUS_LABEL,
  STATUS_TONE,
  totalPending,
  totalQty,
  totalReceived,
  type PurchaseOrder,
} from "../lib/orders";
import { ReceiveOrderDialog } from "./receive-order-dialog";

type Props = {
  orders: PurchaseOrder[];
};

export function OurPurchasesSection({ orders }: Props) {
  const inFlight = useMemo(
    () =>
      orders
        .filter(
          (o) =>
            !isMonthlyPlan(o) &&
            (o.status === "ordered" ||
              o.status === "received_partial" ||
              o.status === "received"),
        )
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [orders],
  );

  if (inFlight.length === 0) return null;

  const awaiting = inFlight.filter(
    (o) => o.status === "ordered" || o.status === "received_partial",
  ).length;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="inline-flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            <ShoppingCart className="size-4 text-primary" />
            Nuestras compras
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Órdenes que ya enviamos al proveedor.{" "}
            {awaiting > 0
              ? `Confirmá cuando llegue cada una para sumar al stock (${awaiting} esperando entrega).`
              : "Todas recibidas en el inventario."}
          </p>
        </div>
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {inFlight.length} {inFlight.length === 1 ? "compra" : "compras"}
        </span>
      </header>

      <ul className="flex flex-col gap-2">
        {inFlight.map((o, i) => (
          <PurchaseRow key={o.id} order={o} delay={i * 30} />
        ))}
      </ul>
    </section>
  );
}

function PurchaseRow({
  order,
  delay,
}: {
  order: PurchaseOrder;
  delay: number;
}) {
  const [expanded, setExpanded] = useState(
    order.status === "received_partial",
  );
  const [receiveOpen, setReceiveOpen] = useState(false);
  const tone = STATUS_TONE[order.status];
  const total = totalQty(order);
  const received = totalReceived(order);
  const pending = totalPending(order);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: delay / 1000 }}
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
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1",
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
              <span className="text-[12px] text-muted-foreground">
                {order.status === "received" && order.receivedAt
                  ? `recibida ${formatRelative(order.receivedAt)}`
                  : order.orderedAt
                    ? `enviada ${formatRelative(order.orderedAt)}`
                    : `actualizada ${formatRelative(order.updatedAt)}`}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              {order.lines.length}{" "}
              {order.lines.length === 1 ? "ítem" : "ítems"}
              {order.status === "received_partial" ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="font-semibold text-status-low tabular-nums">
                    {received}/{total}
                  </span>{" "}
                  recibidos · faltan {pending}
                </>
              ) : (
                <>
                  {" "}
                  · {total} {total === 1 ? "unidad" : "unidades"}
                </>
              )}
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
          {(order.status === "ordered" ||
            order.status === "received_partial") && (
            <Button
              size="xs"
              onClick={() => setReceiveOpen(true)}
              className="bg-status-healthy text-white hover:brightness-110"
            >
              <PackageCheck className="size-3" />
              {order.status === "received_partial"
                ? "Recibir el resto"
                : "Lo recibí"}
            </Button>
          )}
          {order.status === "received" && (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-status-healthy">
              <CheckCircle2 className="size-3.5" />
              Sumada al stock
            </span>
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
              </div>
            )}

            <ul className="divide-y divide-border/40 px-4 py-2">
              {order.lines.map((l) => {
                const rec = l.receivedQty ?? 0;
                const lpending = Math.max(0, l.qty - rec);
                const fully = lpending === 0 && rec > 0;
                const partial = rec > 0 && lpending > 0;
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
                        {fully && (
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
                      {rec > 0 ? (
                        <>
                          <span className="text-status-healthy">{rec}</span>
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
