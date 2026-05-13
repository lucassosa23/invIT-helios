"use client";

import { useEffect, useMemo, useState } from "react";

import type { Asset, Status } from "@/lib/fake-data";
import { loadInventory, subscribeInventory } from "@/lib/storage";

type Counts = Record<Status, number>;

export type InventoryStats = {
  assets: Asset[];
  total: number;
  counts: Counts;
  healthPct: number;
  byCategory: Array<{
    category: string;
    total: number;
    counts: Counts;
    dominant: Status;
  }>;
  byLocation: Array<{
    locationId: string;
    total: number;
    counts: Counts;
    dominant: Status;
  }>;
  criticalItems: Asset[];
  trend: number[];
  hydrated: boolean;
  usingFallback: boolean;
};

const emptyCounts = (): Counts => ({
  healthy: 0,
  low: 0,
  critical: 0,
  out: 0,
});

function dominantStatus(counts: Counts): Status {
  const out = counts.out;
  const critical = counts.critical;
  const low = counts.low;
  if (critical + out > counts.healthy * 0.4) {
    return out >= critical ? "out" : "critical";
  }
  if (low > counts.healthy * 0.4) return "low";
  return "healthy";
}

function computeStats(assets: Asset[]): Omit<InventoryStats, "hydrated" | "usingFallback"> {
  const counts = emptyCounts();
  const catMap = new Map<string, Counts>();
  const locMap = new Map<string, Counts>();

  for (const a of assets) {
    counts[a.status]++;
    if (!catMap.has(a.category)) catMap.set(a.category, emptyCounts());
    catMap.get(a.category)![a.status]++;
    if (!locMap.has(a.locationId)) locMap.set(a.locationId, emptyCounts());
    locMap.get(a.locationId)![a.status]++;
  }

  const total = assets.length;
  const healthPct = total === 0 ? 0 : Math.round((counts.healthy / total) * 100);

  const byCategory = Array.from(catMap.entries())
    .map(([category, c]) => {
      const t = c.healthy + c.low + c.critical + c.out;
      return { category, total: t, counts: c, dominant: dominantStatus(c) };
    })
    .sort((a, b) => b.total - a.total);

  const byLocation = Array.from(locMap.entries())
    .map(([locationId, c]) => {
      const t = c.healthy + c.low + c.critical + c.out;
      return { locationId, total: t, counts: c, dominant: dominantStatus(c) };
    })
    .sort((a, b) => b.total - a.total);

  const criticalItems = assets
    .filter((a) => a.status === "critical" || a.status === "out")
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  const trend = buildTrend(total);

  return {
    assets,
    total,
    counts,
    healthPct,
    byCategory,
    byLocation,
    criticalItems,
    trend,
  };
}

function buildTrend(total: number): number[] {
  if (total === 0) return Array.from({ length: 7 }, () => 0);
  // sintético pero estable: 7 puntos crecientes hacia el total actual
  const base = Math.max(1, total * 0.85);
  return Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    const noise = 1 + Math.sin(i * 1.3) * 0.04;
    return Math.round(base + (total - base) * t * noise);
  });
}

export function useInventoryStats(fallback: Asset[]): InventoryStats {
  const [assets, setAssets] = useState<Asset[]>(fallback);
  const [hydrated, setHydrated] = useState(false);
  const [usingFallback, setUsingFallback] = useState(true);

  useEffect(() => {
    const compute = () => {
      const stored = loadInventory();
      if (stored && stored.length > 0) {
        setAssets(stored);
        setUsingFallback(false);
      } else {
        setAssets(fallback);
        setUsingFallback(true);
      }
      setHydrated(true);
    };
    compute();
    return subscribeInventory(compute);
  }, [fallback]);

  return useMemo(
    () => ({ ...computeStats(assets), hydrated, usingFallback }),
    [assets, hydrated, usingFallback],
  );
}
