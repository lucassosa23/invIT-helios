"use client";

import { statusFromStock, type Asset, type Priority } from "@/lib/fake-data";
import { loadInventory, saveInventory } from "@/lib/storage";
import {
  loadOrders,
  saveOrders,
} from "@/features/procurement/lib/orders-storage";
import type {
  OrderLine,
  PurchaseOrder,
} from "@/features/procurement/lib/orders";
import { getOrCreateMonthlyPlan } from "@/features/procurement/lib/monthly-plan";

export type RequestStatus =
  | "pending"
  | "awaiting_purchase"
  | "ready_to_deliver"
  | "delivered"
  | "rejected";

export type InternalRequest = {
  id: string;
  reference: string;
  requesterName: string;
  requesterTeam: string;
  itemName: string;
  assetId?: string;
  brand: string;
  category: string;
  qty: number;
  priority: Priority;
  reason: string;
  status: RequestStatus;
  linkedOrderId?: string;
  createdAt: Date;
  approvedAt?: Date;
  deliveredAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
};

const KEY_REQUESTS = "invit:requests:v1";

type StoredRequest = Omit<
  InternalRequest,
  "createdAt" | "approvedAt" | "deliveredAt" | "rejectedAt"
> & {
  createdAt: string;
  approvedAt?: string;
  deliveredAt?: string;
  rejectedAt?: string;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadRequests(): InternalRequest[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY_REQUESTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredRequest[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r) => ({
      ...r,
      createdAt: new Date(r.createdAt),
      approvedAt: r.approvedAt ? new Date(r.approvedAt) : undefined,
      deliveredAt: r.deliveredAt ? new Date(r.deliveredAt) : undefined,
      rejectedAt: r.rejectedAt ? new Date(r.rejectedAt) : undefined,
    }));
  } catch {
    return [];
  }
}

export function saveRequests(requests: InternalRequest[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY_REQUESTS, JSON.stringify(requests));
    window.dispatchEvent(new Event("invit:requests-changed"));
  } catch {
    /* ignore quota */
  }
}

export function subscribeRequests(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:requests-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:requests-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

export function nextRequestRef(existing: InternalRequest[]): string {
  const max = existing
    .map((r) => {
      const m = r.reference.match(/REQ-(\d+)/);
      return m && m[1] ? parseInt(m[1], 10) : 0;
    })
    .reduce((a, b) => Math.max(a, b), 0);
  return `REQ-${String(max + 1).padStart(4, "0")}`;
}

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pendiente",
  awaiting_purchase: "Esperando compra",
  ready_to_deliver: "Listo para entregar",
  delivered: "Entregado",
  rejected: "Rechazado",
};

export const STATUS_TONE: Record<
  RequestStatus,
  { dot: string; bg: string; text: string; ring: string }
> = {
  pending: {
    dot: "bg-status-low",
    bg: "bg-status-low-soft",
    text: "text-status-low",
    ring: "ring-status-low/30",
  },
  awaiting_purchase: {
    dot: "bg-status-info",
    bg: "bg-status-info-soft",
    text: "text-status-info",
    ring: "ring-status-info/30",
  },
  ready_to_deliver: {
    dot: "bg-primary",
    bg: "bg-primary/15",
    text: "text-primary",
    ring: "ring-primary/30",
  },
  delivered: {
    dot: "bg-status-healthy",
    bg: "bg-status-healthy-soft",
    text: "text-status-healthy",
    ring: "ring-status-healthy/30",
  },
  rejected: {
    dot: "bg-muted-foreground",
    bg: "bg-muted",
    text: "text-muted-foreground",
    ring: "ring-foreground/10",
  },
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export const PRIORITY_TONE: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground ring-foreground/10",
  medium: "bg-status-info-soft text-status-info ring-status-info/30",
  high: "bg-status-low-soft text-status-low ring-status-low/30",
  urgent:
    "bg-status-critical-soft text-status-critical ring-status-critical/30",
};

export function availableStockFor(
  request: InternalRequest,
  inventory: Asset[],
): number {
  if (!request.assetId) return 0;
  const a = inventory.find((x) => x.id === request.assetId);
  return a ? a.stock : 0;
}

export type DeliveryResult =
  | { ok: true; remainingStock: number }
  | { ok: false; reason: string };

/** Descuenta del inventario la cantidad pedida. Bloquea si stock insuficiente. */
export function applyDeliveryToInventory(
  request: InternalRequest,
): DeliveryResult {
  if (!request.assetId) {
    return {
      ok: false,
      reason: "El pedido no está vinculado a un item del catálogo.",
    };
  }
  const inventory = loadInventory() ?? [];
  const idx = inventory.findIndex((a) => a.id === request.assetId);
  if (idx < 0) {
    return { ok: false, reason: "El item ya no existe en el inventario." };
  }
  const asset = inventory[idx];
  if (asset.stock < request.qty) {
    return {
      ok: false,
      reason: `Stock insuficiente (${asset.stock} disponible, ${request.qty} requerido).`,
    };
  }
  const newStock = asset.stock - request.qty;
  const updated: Asset = {
    ...asset,
    stock: newStock,
    status: statusFromStock(newStock, asset.threshold),
    updatedAt: new Date(),
  };
  const next = inventory.slice();
  next[idx] = updated;
  saveInventory(next);
  return { ok: true, remainingStock: newStock };
}

/**
 * Reconcilia todos los pedidos en awaiting_purchase contra el inventario
 * actual: si encuentra stock suficiente (por assetId o por nombre+marca
 * para ad-hoc), los flippea a ready_to_deliver. Se llama:
 *   - al recibir una PO (después de aplicar al inventario)
 *   - al detectar cambios manuales en el inventario (subscripción)
 */
export function reconcileAwaitingRequests(): {
  flipped: number;
  reasons: { id: string; reference: string }[];
} {
  const requests = loadRequests();
  const inventory = loadInventory() ?? [];
  const reasons: { id: string; reference: string }[] = [];

  const findMatch = (
    r: InternalRequest,
  ): { asset?: Asset; stock: number } => {
    if (r.assetId) {
      const a = inventory.find((x) => x.id === r.assetId);
      return { asset: a, stock: a?.stock ?? 0 };
    }
    const want = r.itemName.trim().toLowerCase();
    const brand = r.brand.trim().toLowerCase();
    const a = inventory.find((x) => {
      if (x.name.trim().toLowerCase() !== want) return false;
      if (!brand) return true;
      return x.brand.trim().toLowerCase() === brand;
    });
    return { asset: a, stock: a?.stock ?? 0 };
  };

  const next = requests.map((r) => {
    if (r.status !== "awaiting_purchase") return r;
    const { asset, stock } = findMatch(r);
    if (asset && stock >= r.qty) {
      reasons.push({ id: r.id, reference: r.reference });
      return {
        ...r,
        status: "ready_to_deliver" as RequestStatus,
        assetId: r.assetId ?? asset.id,
      };
    }
    return r;
  });

  if (reasons.length > 0) saveRequests(next);
  return { flipped: reasons.length, reasons };
}

/** Marca un pedido como listo manualmente, vinculando assetId si encuentra
 * matching en el inventario actual. Útil cuando el usuario sabe que ya
 * tiene el item aunque el sistema no lo detecte automáticamente. */
export function markRequestReadyManually(
  requestId: string,
): { ok: true } | { ok: false; reason: string } {
  const requests = loadRequests();
  const inventory = loadInventory() ?? [];
  const idx = requests.findIndex((r) => r.id === requestId);
  if (idx < 0) return { ok: false, reason: "Pedido no encontrado." };
  const r = requests[idx];
  if (r.status !== "awaiting_purchase" && r.status !== "pending") {
    return { ok: false, reason: "El pedido no está pendiente de stock." };
  }

  // Intentar vincular assetId si es ad-hoc
  let resolvedAssetId = r.assetId;
  if (!resolvedAssetId) {
    const want = r.itemName.trim().toLowerCase();
    const brand = r.brand.trim().toLowerCase();
    const match = inventory.find((x) => {
      if (x.name.trim().toLowerCase() !== want) return false;
      if (!brand) return true;
      return x.brand.trim().toLowerCase() === brand;
    });
    if (match) resolvedAssetId = match.id;
  }

  const next = requests.slice();
  next[idx] = {
    ...r,
    status: "ready_to_deliver",
    assetId: resolvedAssetId,
  };
  saveRequests(next);
  return { ok: true };
}

/** Auto-flip awaiting_purchase → ready_to_deliver al recibir una PO (o
 * cualquier cambio de inventario). Solo flippea si el stock actualizado
 * efectivamente alcanza la cantidad pedida — así en recepciones parciales
 * que no llegan a cubrir el qty del request, el pedido sigue esperando.
 *
 * Para ad-hoc (request sin assetId): intenta matchear por nombre+marca
 * contra el inventario; si encuentra y alcanza, también binda el assetId
 * para que la entrega pueda descontar stock correctamente.
 */
export function cascadeRequestsOnOrderReceived(_orderId: string): number {
  return reconcileAwaitingRequests().flipped;
}

/** Al cancelar la PO, los pedidos vinculados vuelven a pending sin orderId. */
export function cascadeRequestsOnOrderCancelled(orderId: string): number {
  const requests = loadRequests();
  let touched = 0;
  const next = requests.map((r) => {
    if (r.linkedOrderId === orderId && r.status === "awaiting_purchase") {
      touched++;
      return {
        ...r,
        status: "pending" as RequestStatus,
        linkedOrderId: undefined,
      };
    }
    return r;
  });
  if (touched > 0) saveRequests(next);
  return touched;
}

/** Vincula un set de requests a una PO (usado desde el diálogo de compras). */
export function linkRequestsToOrder(orderId: string, requestIds: string[]) {
  const ids = new Set(requestIds);
  const requests = loadRequests();
  let touched = 0;
  const next = requests.map((r) => {
    if (ids.has(r.id) && r.status !== "delivered" && r.status !== "rejected") {
      touched++;
      return {
        ...r,
        status: "awaiting_purchase" as RequestStatus,
        linkedOrderId: orderId,
        approvedAt: r.approvedAt ?? new Date(),
      };
    }
    return r;
  });
  if (touched > 0) saveRequests(next);
  return touched;
}

/**
 * Sincroniza los vínculos pedido↔PO desde el diálogo de compras: vincula los
 * que están en la selección actual y desvincula (vuelve a pending) los que
 * antes estaban vinculados a la orden pero ya no.
 */
export function syncOrderRequestLinks(
  orderId: string,
  selectedRequestIds: string[],
): { linked: number; unlinked: number } {
  const selected = new Set(selectedRequestIds);
  const requests = loadRequests();
  const now = new Date();
  let linked = 0;
  let unlinked = 0;

  const next = requests.map((r) => {
    const isSelected = selected.has(r.id);
    const wasLinked = r.linkedOrderId === orderId;

    if (isSelected && r.status !== "delivered" && r.status !== "rejected") {
      if (!wasLinked || r.status !== "awaiting_purchase") linked++;
      return {
        ...r,
        status: "awaiting_purchase" as RequestStatus,
        linkedOrderId: orderId,
        approvedAt: r.approvedAt ?? now,
      };
    }

    if (!isSelected && wasLinked && r.status === "awaiting_purchase") {
      unlinked++;
      return {
        ...r,
        status: "pending" as RequestStatus,
        linkedOrderId: undefined,
      };
    }

    return r;
  });

  if (linked > 0 || unlinked > 0) saveRequests(next);
  return { linked, unlinked };
}

function lineFromRequest(req: InternalRequest): OrderLine {
  return {
    id: `ln_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    assetId: req.assetId,
    name: req.itemName,
    brand: req.brand,
    category: req.category || "Otros",
    isNew: !req.assetId,
    qty: req.qty,
  };
}

/**
 * Aprueba un pedido que requiere compra: lo suma al "Plan de compras del
 * mes" (el draft especial PO-PLAN-YYYY-MM) y deja el pedido en
 * awaiting_purchase vinculado a ese plan. Si el item ya está en una línea,
 * suma la qty.
 */
export function approveRequestToPurchase(request: InternalRequest): {
  orderId: string;
  orderReference: string;
} {
  const target = getOrCreateMonthlyPlan();

  const existingLineIdx = target.lines.findIndex((l) =>
    request.assetId
      ? l.assetId === request.assetId
      : l.isNew &&
        l.name.toLowerCase() === request.itemName.toLowerCase() &&
        (l.brand || "").toLowerCase() === (request.brand || "").toLowerCase(),
  );

  const nextLines =
    existingLineIdx >= 0
      ? target.lines.map((l, i) =>
          i === existingLineIdx ? { ...l, qty: l.qty + request.qty } : l,
        )
      : [...target.lines, lineFromRequest(request)];

  const now = new Date();
  const updatedOrder: PurchaseOrder = {
    ...target,
    lines: nextLines,
    updatedAt: now,
  };

  const orders = loadOrders();
  const nextOrders = orders.map((o) =>
    o.id === target.id ? updatedOrder : o,
  );
  saveOrders(nextOrders);

  // Actualizar el request
  const requests = loadRequests();
  const nextRequests = requests.map((r) =>
    r.id === request.id
      ? {
          ...r,
          status: "awaiting_purchase" as RequestStatus,
          linkedOrderId: updatedOrder.id,
          approvedAt: r.approvedAt ?? now,
        }
      : r,
  );
  saveRequests(nextRequests);

  return {
    orderId: updatedOrder.id,
    orderReference: updatedOrder.reference,
  };
}

const STATUS_FLOW: Record<RequestStatus, RequestStatus[]> = {
  pending: ["awaiting_purchase", "ready_to_deliver", "rejected"],
  awaiting_purchase: ["ready_to_deliver", "pending", "rejected"],
  ready_to_deliver: ["delivered", "rejected"],
  delivered: [],
  rejected: [],
};

export function canTransition(
  from: RequestStatus,
  to: RequestStatus,
): boolean {
  return STATUS_FLOW[from].includes(to);
}
