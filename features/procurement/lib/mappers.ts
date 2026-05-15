import type {
  OrderLine as DbOrderLine,
  PurchaseOrder as DbPurchaseOrder,
  PurchaseOrderStatus as DbPurchaseOrderStatus,
} from "@prisma/client";

import type { OrderLine, PurchaseOrder, PurchaseOrderStatus } from "./orders";

const STATUS_FROM_DB: Record<DbPurchaseOrderStatus, PurchaseOrderStatus> = {
  DRAFT: "draft",
  READY: "ready",
  ORDERED: "ordered",
  PARTIAL: "received_partial",
  RECEIVED: "received",
  CANCELLED: "cancelled",
};

const STATUS_TO_DB: Record<PurchaseOrderStatus, DbPurchaseOrderStatus> = {
  draft: "DRAFT",
  ready: "READY",
  ordered: "ORDERED",
  received_partial: "PARTIAL",
  received: "RECEIVED",
  cancelled: "CANCELLED",
};

export const statusFromDb = (s: DbPurchaseOrderStatus) => STATUS_FROM_DB[s];
export const statusToDb = (s: PurchaseOrderStatus) => STATUS_TO_DB[s];

function lineFromDb(l: DbOrderLine): OrderLine {
  return {
    id: l.id,
    assetId: l.assetId ?? undefined,
    name: l.name,
    brand: l.brand,
    category: l.category,
    isNew: l.isNew,
    qty: l.qty,
    receivedQty: l.receivedQty ?? 0,
  };
}

export function orderFromDb(
  o: DbPurchaseOrder & { lines: DbOrderLine[] },
): PurchaseOrder {
  return {
    id: o.id,
    reference: o.reference,
    status: STATUS_FROM_DB[o.status],
    note: o.note ?? undefined,
    lines: o.lines.map(lineFromDb),
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    orderedAt: o.orderedAt ?? undefined,
    receivedAt: o.receivedAt ?? undefined,
  };
}
