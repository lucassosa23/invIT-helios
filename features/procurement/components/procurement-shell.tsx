"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useOrders } from "../lib/use-orders";
import type { PurchaseOrder } from "../lib/orders";
import { NewOrderDialog } from "./new-order-dialog";
import { OrdersList } from "./orders-list";
import { OrderSummaryCards } from "./order-summary-cards";

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" />
          Nueva orden
        </Button>
      </div>

      <OrderSummaryCards orders={orders} />

      <OrdersList
        orders={orders}
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
