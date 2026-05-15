"use client";

import { useEffect } from "react";

import type { PurchaseOrder } from "../lib/orders";
import { saveOrders } from "../lib/orders-storage";

/** Shim transitorio: sincroniza localStorage de orders con la DB en
 *  cada navegación. monthly-plan.ts, our-purchases-section y otros
 *  consumers de loadOrders siguen leyendo data fresca mientras
 *  termino de migrarlos.
 *
 *  Se borra cuando todo procurement-related lea directo de la DB. */
export function OrdersHydrator({ orders }: { orders: PurchaseOrder[] }) {
  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  return null;
}
