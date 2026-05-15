"use client";

import type {
  ActivityEvent,
  Asset,
  Location,
  ProcurementItem,
  RequestItem,
} from "@/lib/fake-data";

import { useInventoryStats } from "../lib/use-inventory-stats";
import { PulseCard } from "./pulse-card";
import { QuickActions } from "./quick-actions";
import { CategoryTreemap } from "./category-treemap";
import { LiveAlerts } from "./live-alerts";
import { LocationDistribution } from "./location-distribution";
import { RecentActivity } from "./recent-activity";

type Props = {
  assets: Asset[];
  locations: Location[];
  procurement: ProcurementItem[];
  requests: RequestItem[];
  activity: ActivityEvent[];
};

export function DashboardShell({
  assets,
  locations,
  procurement,
  requests,
  activity,
}: Props) {
  const stats = useInventoryStats(assets);

  const procurementPending = procurement.filter(
    (p) => p.status === "pending" || p.status === "ready",
  ).length;
  const requestsPending = requests.filter(
    (r) => r.status === "pending" || r.status === "approved",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <PulseCard stats={stats} />
      <QuickActions
        criticalCount={stats.counts.critical + stats.counts.out}
        procurementPending={procurementPending}
        requestsPending={requestsPending}
      />
      <CategoryTreemap byCategory={stats.byCategory} />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <LiveAlerts items={stats.criticalItems} locations={locations} />
        <LocationDistribution
          byLocation={stats.byLocation}
          locations={locations}
        />
      </div>
      <RecentActivity events={activity} />
    </div>
  );
}
