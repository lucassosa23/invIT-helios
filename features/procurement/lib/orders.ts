// Tipos + helpers puros de procurement. Sin "use client" — los consume
// también el lado server (Server Actions, queries).

/**
 * Reconoce si una orden es el plan de compras del mes (referencia tipo
 * PO-PLAN-YYYY-MM).
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
  assetId?: string;
  name: string;
  brand: string;
  category: string;
  isNew: boolean;
  qty: number;
  receivedQty?: number;
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
  qty: number;
};

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
