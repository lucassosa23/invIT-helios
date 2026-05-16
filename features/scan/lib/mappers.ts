import type {
  ScanLine as DbScanLine,
  ScanSession as DbScanSession,
  ScanSessionKind as DbKind,
  ScanSessionStatus as DbStatus,
  UnknownScan as DbUnknownScan,
  Asset as DbAsset,
} from "@prisma/client";

import type {
  ScanKind,
  ScanLine,
  ScanSession,
  ScanStatus,
  UnknownScan,
} from "./scan";

export const kindFromDb = (k: DbKind): ScanKind =>
  k === "IN" ? "in" : "out";

export const kindToDb = (k: ScanKind): DbKind =>
  k === "in" ? "IN" : "OUT";

const STATUS_FROM_DB: Record<DbStatus, ScanStatus> = {
  OPEN: "open",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
};

export const statusFromDb = (s: DbStatus): ScanStatus => STATUS_FROM_DB[s];

export function unknownFromDb(u: DbUnknownScan): UnknownScan {
  return {
    id: u.id,
    barcode: u.barcode,
    count: u.count,
    firstScanAt: u.firstScanAt,
    resolvedAt: u.resolvedAt ?? null,
    resolvedToAssetId: u.resolvedToAssetId ?? null,
  };
}

type DbScanLineWithAsset = DbScanLine & {
  asset: Pick<DbAsset, "name" | "brand" | "category" | "stock">;
};

export function scanLineFromDb(l: DbScanLineWithAsset): ScanLine {
  return {
    id: l.id,
    assetId: l.assetId,
    assetName: l.asset.name,
    assetBrand: l.asset.brand,
    assetCategory: l.asset.category,
    currentStock: l.asset.stock,
    qty: l.qty,
    barcode: l.barcode ?? null,
    lastScanAt: l.lastScanAt,
  };
}

type DbSessionWithDetails = DbScanSession & {
  lines: DbScanLineWithAsset[];
  unknowns: DbUnknownScan[];
};

export function sessionFromDb(s: DbSessionWithDetails): ScanSession {
  return {
    id: s.id,
    name: s.name,
    kind: kindFromDb(s.kind),
    status: STATUS_FROM_DB[s.status],
    actorId: s.actorId ?? null,
    createdAt: s.createdAt,
    confirmedAt: s.confirmedAt ?? null,
    lines: s.lines.map(scanLineFromDb),
    unknowns: s.unknowns.map(unknownFromDb),
  };
}
