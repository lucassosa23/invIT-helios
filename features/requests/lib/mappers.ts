import type {
  InternalRequest as DbRequest,
  Priority as DbPriority,
  RequestStatus as DbRequestStatus,
} from "@prisma/client";

import type { Priority } from "@/lib/fake-data";

import type { InternalRequest, RequestStatus } from "./requests";

const STATUS_FROM_DB: Record<DbRequestStatus, RequestStatus> = {
  PENDING: "pending",
  AWAITING_PURCHASE: "awaiting_purchase",
  READY_TO_DELIVER: "ready_to_deliver",
  DELIVERED: "delivered",
  REJECTED: "rejected",
  // En la DB existe por compat histórico; la app la trata como rejected.
  CANCELLED: "rejected",
};

const STATUS_TO_DB: Record<RequestStatus, DbRequestStatus> = {
  pending: "PENDING",
  awaiting_purchase: "AWAITING_PURCHASE",
  ready_to_deliver: "READY_TO_DELIVER",
  delivered: "DELIVERED",
  rejected: "REJECTED",
};

const PRIORITY_FROM_DB: Record<DbPriority, Priority> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

const PRIORITY_TO_DB: Record<Priority, DbPriority> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
  urgent: "URGENT",
};

export const requestStatusFromDb = (s: DbRequestStatus) => STATUS_FROM_DB[s];
export const requestStatusToDb = (s: RequestStatus) => STATUS_TO_DB[s];
export const priorityFromDb = (p: DbPriority) => PRIORITY_FROM_DB[p];
export const priorityToDb = (p: Priority) => PRIORITY_TO_DB[p];

export function requestFromDb(r: DbRequest): InternalRequest {
  return {
    id: r.id,
    reference: r.reference,
    requesterName: r.requesterName,
    requesterTeam: r.requesterTeam,
    itemName: r.itemName,
    assetId: r.assetId ?? undefined,
    brand: r.brand,
    category: r.category,
    qty: r.qty,
    priority: PRIORITY_FROM_DB[r.priority],
    reason: r.reason,
    status: STATUS_FROM_DB[r.status],
    linkedOrderId: r.linkedOrderId ?? undefined,
    createdAt: r.createdAt,
    approvedAt: r.approvedAt ?? undefined,
    deliveredAt: r.deliveredAt ?? undefined,
    rejectedAt: r.rejectedAt ?? undefined,
    rejectionReason: r.rejectionReason ?? undefined,
  };
}
