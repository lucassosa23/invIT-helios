"use client";

// Compat layer transitorio: monthly-plan.ts, our-purchases-section y
// otros consumers de orders todavía leen / escriben localStorage.
// Un <OrdersHydrator> sincroniza esto con la DB en cada navegación.
// Cuando termine de migrar esos consumers, este archivo se borra.

import type { PurchaseOrder } from "./orders";

const KEY_ORDERS = "invit:orders:v1";

type StoredOrder = Omit<
  PurchaseOrder,
  "createdAt" | "updatedAt" | "orderedAt" | "receivedAt"
> & {
  createdAt: string;
  updatedAt: string;
  orderedAt?: string;
  receivedAt?: string;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadOrders(): PurchaseOrder[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY_ORDERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredOrder[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((o) => ({
      ...o,
      createdAt: new Date(o.createdAt),
      updatedAt: new Date(o.updatedAt),
      orderedAt: o.orderedAt ? new Date(o.orderedAt) : undefined,
      receivedAt: o.receivedAt ? new Date(o.receivedAt) : undefined,
    }));
  } catch {
    return [];
  }
}

export function saveOrders(orders: PurchaseOrder[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY_ORDERS, JSON.stringify(orders));
    window.dispatchEvent(new Event("invit:orders-changed"));
  } catch {
    /* ignore quota errors */
  }
}

export function subscribeOrders(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:orders-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:orders-changed", cb);
    window.removeEventListener("storage", cb);
  };
}
