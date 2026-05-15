"use client";

import { useEffect, useState } from "react";

import type { PurchaseOrder } from "./orders";
import { loadOrders, subscribeOrders } from "./orders-storage";

export function useOrders(): {
  orders: PurchaseOrder[];
  hydrated: boolean;
} {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const compute = () => {
      setOrders(loadOrders());
      setHydrated(true);
    };
    compute();
    return subscribeOrders(compute);
  }, []);

  return { orders, hydrated };
}
