import type {
  Asset as DbAsset,
  AssetStatus as DbAssetStatus,
  Location as DbLocation,
} from "@prisma/client";

import type { Asset, Location, Status } from "@/lib/fake-data";

// Mapeo entre los enums uppercase de Prisma y los lowercase que la app
// usaba en localStorage. Mantener este mapper acotado nos permite, en un
// commit futuro, sacar los tipos lowercase y consumir Prisma directo.

const STATUS_FROM_DB: Record<DbAssetStatus, Status> = {
  HEALTHY: "healthy",
  LOW: "low",
  CRITICAL: "critical",
  OUT: "out",
};

const STATUS_TO_DB: Record<Status, DbAssetStatus> = {
  healthy: "HEALTHY",
  low: "LOW",
  critical: "CRITICAL",
  out: "OUT",
};

export const statusFromDb = (s: DbAssetStatus): Status => STATUS_FROM_DB[s];
export const statusToDb = (s: Status): DbAssetStatus => STATUS_TO_DB[s];

export function assetFromDb(a: DbAsset): Asset {
  return {
    id: a.id,
    sku: a.sku,
    name: a.name,
    brand: a.brand,
    category: a.category,
    stock: a.stock,
    threshold: a.threshold,
    unitCost: a.unitCost,
    locationId: a.locationId ?? "",
    vendorId: a.vendorId ?? "",
    warrantyExpiresAt: a.warrantyExpiresAt ?? new Date(0),
    status: STATUS_FROM_DB[a.status],
    updatedAt: a.updatedAt,
    dismissedFromAutoPlan: a.dismissedFromAutoPlan,
  };
}

export function locationFromDb(l: DbLocation): Location {
  return { id: l.id, name: l.name, zone: l.zone };
}
