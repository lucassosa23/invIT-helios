// Tipos + helpers puros de requests. Sin "use client" — los consume
// también el lado server (Server Actions, queries, mappers).
//
// Las funciones de localStorage + ops legacy (applyDeliveryToInventory,
// reconcileAwaitingRequests, syncOrderRequestLinks, etc.) viven en
// requests-storage.ts. Se migran a Server Actions una por una; el
// hydrator mantiene el localStorage fresco mientras tanto.

import type { Asset, Priority } from "@/lib/fake-data";

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

export function nextRequestRef(existing: InternalRequest[]): string {
  const max = existing
    .map((r) => {
      const m = r.reference.match(/REQ-(\d+)/);
      return m && m[1] ? parseInt(m[1], 10) : 0;
    })
    .reduce((a, b) => Math.max(a, b), 0);
  return `REQ-${String(max + 1).padStart(4, "0")}`;
}

export function availableStockFor(
  request: InternalRequest,
  inventory: Asset[],
): number {
  if (!request.assetId) return 0;
  const a = inventory.find((x) => x.id === request.assetId);
  return a ? a.stock : 0;
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
