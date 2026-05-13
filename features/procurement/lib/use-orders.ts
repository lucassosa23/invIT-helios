"use client";

import { useEffect, useState } from "react";

import {
  loadOrders,
  subscribeOrders,
  type PurchaseOrder,
} from "./orders";

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
