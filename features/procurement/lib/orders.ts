"use client";

import { statusFromStock, type Asset } from "@/lib/fake-data";
import { loadInventory, saveInventory } from "@/lib/storage";

/**
 * Reconoce si una orden es el plan de compras del mes (referencia tipo
 * PO-PLAN-YYYY-MM). Helper duplicado acá para evitar dependencias
 * circulares con monthly-plan.ts.
 */
export function isMonthlyPlan(order: { reference: string }): boolean {
  return /^PO-PLAN-\d{4}-\d{2}$/.test(order.reference);
}

export type PurchaseOrderStatus =
  | "draft"
  | "ready"
  | "ordered"
  | "received_partial"
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
  receivedQty?: number; // suma acumulada de lo recibido en entregas parciales
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

/** Cantidades que faltan por recibir por línea. */
export function pendingPerLine(order: PurchaseOrder): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of order.lines) {
    const received = l.receivedQty ?? 0;
    m.set(l.id, Math.max(0, l.qty - received));
  }
  return m;
}

export function totalReceived(order: PurchaseOrder): number {
  return order.lines.reduce((s, l) => s + (l.receivedQty ?? 0), 0);
}

export function totalPending(order: PurchaseOrder): number {
  return order.lines.reduce(
    (s, l) => s + Math.max(0, l.qty - (l.receivedQty ?? 0)),
    0,
  );
}

/** Determina el status según el avance de las líneas. */
export function deriveStatusAfterReceive(
  order: PurchaseOrder,
): PurchaseOrderStatus {
  const allComplete = order.lines.every(
    (l) => (l.receivedQty ?? 0) >= l.qty,
  );
  const anyReceived = order.lines.some((l) => (l.receivedQty ?? 0) > 0);
  if (allComplete) return "received";
  if (anyReceived) return "received_partial";
  return order.status;
}

export type Shipment = {
  lineId: string;
  qty: number; // cantidad recibida en esta entrega (>= 0)
};

export type ShipmentResult = {
  updated: number; // assets existentes actualizados
  created: number; // assets nuevos creados desde líneas isNew
  newStatus: PurchaseOrderStatus;
  updatedOrder: PurchaseOrder;
  totalAdded: number; // suma de unidades agregadas al inventario
};

/**
 * Aplica una entrega parcial (o completa) al inventario y actualiza la orden.
 * `shipments` es un array con cuánto se recibe AHORA por línea (no acumulado).
 * Para una recepción completa de una sola vez: shipments = todas las pendientes.
 *
 * Maneja:
 *   - Líneas existentes (con assetId): suma stock al asset.
 *   - Líneas nuevas (isNew): crea el asset en la primera entrega, después solo
 *     suma. El assetId creado se persiste en la línea para entregas futuras.
 *   - Cierre automático del status: si todo se recibió → "received", sino
 *     queda en "received_partial".
 */
export function receiveOrderShipment(
  orderId: string,
  shipments: Shipment[],
): ShipmentResult | { ok: false; reason: string } {
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx < 0) return { ok: false, reason: "Orden no encontrada." };
  const order = orders[idx];

  if (order.status !== "ordered" && order.status !== "received_partial") {
    return {
      ok: false,
      reason: "Solo se pueden recibir órdenes en estado Enviada o parcial.",
    };
  }

  const inventory = loadInventory() ?? [];
  const byAssetId = new Map(inventory.map((a) => [a.id, a]));
  const now = new Date();

  let updated = 0;
  let created = 0;
  let totalAdded = 0;

  // Mapeo de lineId → shipment
  const shipmentByLine = new Map<string, number>();
  for (const s of shipments) {
    if (s.qty > 0) shipmentByLine.set(s.lineId, s.qty);
  }
  if (shipmentByLine.size === 0) {
    return { ok: false, reason: "No marcaste cantidad recibida en ninguna línea." };
  }

  const nextLines: OrderLine[] = order.lines.map((line) => {
    const incoming = shipmentByLine.get(line.id) ?? 0;
    if (incoming <= 0) return line;

    let resolvedAssetId = line.assetId;

    if (resolvedAssetId && byAssetId.has(resolvedAssetId)) {
      const a = byAssetId.get(resolvedAssetId)!;
      const newStock = a.stock + incoming;
      byAssetId.set(a.id, {
        ...a,
        stock: newStock,
        status: statusFromStock(newStock, a.threshold),
        updatedAt: now,
      });
      updated++;
    } else {
      // Primera entrega de una línea isNew: crear asset
      const id = `ast_po_${now.getTime().toString(36)}_${created}_${Math.random().toString(36).slice(2, 5)}`;
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
        stock: incoming,
        threshold,
        unitCost: 0,
        locationId: inventory[0]?.locationId ?? "",
        vendorId: "",
        warrantyExpiresAt: new Date(0),
        status: statusFromStock(incoming, threshold),
        updatedAt: now,
      };
      byAssetId.set(id, asset);
      resolvedAssetId = id;
      created++;
    }

    totalAdded += incoming;
    return {
      ...line,
      assetId: resolvedAssetId,
      receivedQty: (line.receivedQty ?? 0) + incoming,
    };
  });

  saveInventory(Array.from(byAssetId.values()));

  const orderInProgress: PurchaseOrder = {
    ...order,
    lines: nextLines,
    updatedAt: now,
  };
  const newStatus = deriveStatusAfterReceive(orderInProgress);
  const updatedOrder: PurchaseOrder = {
    ...orderInProgress,
    status: newStatus,
    receivedAt: newStatus === "received" ? now : order.receivedAt,
  };

  const nextOrders = orders.slice();
  nextOrders[idx] = updatedOrder;
  saveOrders(nextOrders);

  return { updated, created, newStatus, updatedOrder, totalAdded };
}

/** Compat: recibe la orden completa de una sola vez (legacy). */
export function applyOrderToInventory(order: PurchaseOrder): ApplyResult {
  const shipments: Shipment[] = order.lines.map((l) => ({
    lineId: l.id,
    qty: Math.max(0, l.qty - (l.receivedQty ?? 0)),
  }));
  const res = receiveOrderShipment(order.id, shipments);
  if ("ok" in res) return { updated: 0, created: 0 };
  return { updated: res.updated, created: res.created };
}

const STATUS_FLOW: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  draft: ["ready", "ordered", "cancelled"],
  ready: ["ordered", "draft", "cancelled"],
  ordered: ["received_partial", "received", "cancelled"],
  received_partial: ["received_partial", "received"],
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
  received_partial: "Recibida parcial",
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
  received_partial: {
    dot: "bg-status-low",
    bg: "bg-status-low-soft",
    text: "text-status-low",
    ring: "ring-status-low/30",
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
