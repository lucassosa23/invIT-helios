"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { isMonthlyPlan, type PurchaseOrder } from "../lib/orders";
import { NewOrderDialog } from "./new-order-dialog";
import { OrdersList } from "./orders-list";
import { OrderSummaryCards } from "./order-summary-cards";
import { MonthlyPlanCard } from "./monthly-plan-card";

type Props = {
  orders: PurchaseOrder[];
};

export function ProcurementShell({ orders }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (o: PurchaseOrder) => {
    setEditing(o);
    setSheetOpen(true);
  };

  // /procurement = solo fase de planificación: drafts + listas para enviar.
  // Las órdenes enviadas (ordered/partial/received) viven en
  // /requests bajo "Nuestras compras". El plan del mes va aparte.
  const planningOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          !isMonthlyPlan(o) &&
          (o.status === "draft" || o.status === "ready"),
      ),
    [orders],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" />
          Nueva orden
        </Button>
      </div>

      <MonthlyPlanCard orders={orders} onEdit={openEdit} />

      <OrderSummaryCards orders={planningOrders} />

      <OrdersList
        orders={planningOrders}
        hydrated
        onEdit={openEdit}
        onCreate={openCreate}
      />

      <NewOrderDialog
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
      />
    </div>
  );
}
