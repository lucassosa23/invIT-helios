"use client";

// Compat layer transitorio: monthly-plan.ts, reports y otros consumers
// todavía leen / escriben localStorage de requests. Un <RequestsHydrator>
// sincroniza con la DB en cada navegación.
// Cuando termine de migrar esos consumers, este archivo se borra.

import { statusFromStock, type Asset } from "@/lib/fake-data";
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

import type { InternalRequest, RequestStatus } from "./requests";

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

// ============================================================
// Ops legacy (transitorias — usadas todavía por monthly-plan y reports)
// ============================================================

export type DeliveryResult =
  | { ok: true; remainingStock: number }
  | { ok: false; reason: string };

/** @deprecated usar deliverRequestAction de actions.ts */
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

/** @deprecated reemplazado por reconcileAwaitingRequestsAction. */
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

/** @deprecated reemplazado por markRequestReadyAction. */
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

/** @deprecated reemplazado por receiveOrderShipmentAction (incluye reconcile). */
export function cascadeRequestsOnOrderReceived(_orderId: string): number {
  return reconcileAwaitingRequests().flipped;
}

/** @deprecated reemplazado por cascadeRequestsOnOrderCancelledAction. */
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

/** @deprecated reemplazado por syncOrderRequestLinksAction. */
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

/** @deprecated reemplazado por syncOrderRequestLinksAction. */
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

/** @deprecated todavía usado por requests-list para "Aprobar para compra";
 *  se migra cuando suba monthly-plan a la DB. */
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
