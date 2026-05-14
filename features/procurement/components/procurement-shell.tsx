"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useOrders } from "../lib/use-orders";
import { isMonthlyPlan, type PurchaseOrder } from "../lib/orders";
import { NewOrderDialog } from "./new-order-dialog";
import { OrdersList } from "./orders-list";
import { OrderSummaryCards } from "./order-summary-cards";
import { MonthlyPlanCard } from "./monthly-plan-card";

export function ProcurementShell() {
  const { orders, hydrated } = useOrders();
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
  // Las órdenes ya enviadas (ordered/received_partial/received) viven en
  // /requests bajo "Nuestras compras". El plan del mes se muestra en su
  // card propio, separado de la lista general. Las canceladas no aparecen
  // (la app no usa "cancelar" — se elimina directo).
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
        hydrated={hydrated}
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
