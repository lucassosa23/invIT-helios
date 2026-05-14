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
      dot: "bg-status-low",
      count: orders.filter((o) => o.status === "draft").length,
    },
    {
      key: "ready",
      label: "Listas para enviar",
      dot: "bg-status-info",
      count: orders.filter((o) => o.status === "ready").length,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {summary.map((s, i) => (
        <motion.div
          key={s.key}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className="flex flex-col gap-2 rounded-xl bg-card px-5 py-4 ring-1 ring-foreground/10 transition-transform hover:-translate-y-0.5"
        >
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", s.dot)} />
            {s.label}
          </span>
          <span className="text-[32px] font-semibold leading-none tabular-nums">
            {s.count}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
