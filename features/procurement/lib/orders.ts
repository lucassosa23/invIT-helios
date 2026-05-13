"use client";

import { statusFromStock, type Asset } from "@/lib/fake-data";
import { loadInventory, saveInventory } from "@/lib/storage";

export type PurchaseOrderStatus =
  | "draft"
  | "ready"
  | "ordered"
  | "received"
  | "cancelled";

export type OrderLine = {
  id: string;
  assetId?: string; // referencia al asset si existe; vacío = ítem nuevo
  name: string;
  brand: string;
  category: string;
  isNew: boolean;
  qty: number;
};

export type PurchaseOrder = {
  id: string;
  reference: string;
  status: PurchaseOrderStatus;
  note?: string;
  lines: OrderLine[];
  createdAt: Date;
  updatedAt: Date;
  orderedAt?: Date;
  receivedAt?: Date;
};

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

export function nextOrderRef(existing: PurchaseOrder[]): string {
  const max = existing
    .map((o) => {
      const m = o.reference.match(/PO-(\d+)/);
      return m && m[1] ? parseInt(m[1], 10) : 0;
    })
    .reduce((a, b) => Math.max(a, b), 0);
  return `PO-${String(max + 1).padStart(4, "0")}`;
}

export function createEmptyOrder(existing: PurchaseOrder[]): PurchaseOrder {
  const now = new Date();
  return {
    id: `ord_${now.getTime().toString(36)}`,
    reference: nextOrderRef(existing),
    status: "draft",
    note: "",
    lines: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function totalQty(order: PurchaseOrder): number {
  return order.lines.reduce((s, l) => s + l.qty, 0);
}

export type ApplyResult = {
  updated: number;
  created: number;
};

/**
 * Aplica una orden recibida al inventario: suma cantidades a items existentes
 * y crea nuevos assets para los marcados como `isNew`. Devuelve cuántos
 * fueron actualizados vs. creados.
 */
export function applyOrderToInventory(order: PurchaseOrder): ApplyResult {
  const inventory = loadInventory() ?? [];
  let updated = 0;
  let created = 0;

  const byId = new Map(inventory.map((a) => [a.id, a]));
  const now = new Date();

  for (const line of order.lines) {
    if (line.assetId && byId.has(line.assetId)) {
      const a = byId.get(line.assetId)!;
      const newStock = a.stock + line.qty;
      byId.set(a.id, {
        ...a,
        stock: newStock,
        status: statusFromStock(newStock, a.threshold),
        updatedAt: now,
      });
      updated++;
    } else {
      const id = `ast_po_${now.getTime().toString(36)}_${created}`;
      const sku = `${(line.category.slice(0, 3) || "GEN").toUpperCase()}-${(
        line.brand.slice(0, 3) || "BRD"
      ).toUpperCase()}-${id.slice(-4).toUpperCase()}`;
      const threshold = Math.max(1, Math.ceil(line.qty * 0.3));
      const asset: Asset = {
        id,
        sku,
        name: line.name,
        brand: line.brand,
        category: line.category || "Otros",
        stock: line.qty,
        threshold,
        unitCost: 0,
        locationId: inventory[0]?.locationId ?? "",
        vendorId: "",
        warrantyExpiresAt: new Date(0),
        status: statusFromStock(line.qty, threshold),
        updatedAt: now,
      };
      byId.set(id, asset);
      created++;
    }
  }

  saveInventory(Array.from(byId.values()));
  return { updated, created };
}

const STATUS_FLOW: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ["ready", "cancelled"],
  ready: ["ordered", "draft", "cancelled"],
  ordered: ["received", "cancelled"],
  received: [],
  cancelled: [],
};

export function canTransition(
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus,
): boolean {
  return STATUS_FLOW[from].includes(to);
}

export const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  draft: "Borrador",
  ready: "Lista para enviar",
  ordered: "Enviada",
  received: "Recibida",
  cancelled: "Cancelada",
};

export const STATUS_TONE: Record<
  PurchaseOrderStatus,
  { dot: string; bg: string; text: string; ring: string }
> = {
  draft: {
    dot: "bg-status-low",
    bg: "bg-status-low-soft",
    text: "text-status-low",
    ring: "ring-status-low/30",
  },
  ready: {
    dot: "bg-status-info",
    bg: "bg-status-info-soft",
    text: "text-status-info",
    ring: "ring-status-info/30",
  },
  ordered: {
    dot: "bg-primary",
    bg: "bg-primary/15",
    text: "text-primary",
    ring: "ring-primary/30",
  },
  received: {
    dot: "bg-status-healthy",
    bg: "bg-status-healthy-soft",
    text: "text-status-healthy",
    ring: "ring-status-healthy/30",
  },
  cancelled: {
    dot: "bg-muted-foreground",
    bg: "bg-muted",
    text: "text-muted-foreground",
    ring: "ring-foreground/10",
  },
};
