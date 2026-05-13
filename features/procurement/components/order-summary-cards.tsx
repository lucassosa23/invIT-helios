"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";
import type { PurchaseOrder } from "../lib/orders";

type Props = {
  orders: PurchaseOrder[];
};

export function OrderSummaryCards({ orders }: Props) {
  const summary = [
    {
      key: "draft",
      label: "Borradores",
      hint: "esperan revisión",
      dot: "bg-status-low",
      count: orders.filter((o) => o.status === "draft").length,
    },
    {
      key: "ready",
      label: "Listas para enviar",
      hint: "aprobadas, listas",
      dot: "bg-status-info",
      count: orders.filter((o) => o.status === "ready").length,
    },
    {
      key: "ordered",
      label: "Enviadas",
      hint: "esperando entrega",
      dot: "bg-primary",
      count: orders.filter((o) => o.status === "ordered").length,
    },
    {
      key: "received",
      label: "Recibidas",
      hint: "ingresadas al inventario",
      dot: "bg-status-healthy",
      count: orders.filter((o) => o.status === "received").length,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {summary.map((s, i) => (
        <motion.div
          key={s.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="flex flex-col gap-2 rounded-xl bg-card px-5 py-4 ring-1 ring-foreground/10 transition-transform hover:-translate-y-0.5"
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", s.dot)} />
            {s.label}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-[28px] font-semibold tabular-nums">
              {s.count}
            </span>
            <span className="text-[12px] text-muted-foreground">{s.hint}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
