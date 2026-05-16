import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getInventory } from "@/features/inventory/lib/queries";
import { MonthlyPlanReconciler } from "@/features/procurement/components/monthly-plan-reconciler";
import { getOrders } from "@/features/procurement/lib/queries";
import { getRequests } from "@/features/requests/lib/queries";
import { MonthlyReminderBanner } from "@/features/reports/components/monthly-reminder-banner";
import { InventoryProvider } from "@/lib/inventory-context";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [assets, orders, requests] = await Promise.all([
    getInventory(),
    getOrders(),
    getRequests(),
  ]);

  const pendingRequestsCount = requests.filter(
    (r) =>
      r.status === "pending" ||
      r.status === "awaiting_purchase" ||
      r.status === "ready_to_deliver",
  ).length;

  return (
    <InventoryProvider value={assets}>
      <div className="relative min-h-svh bg-background">
        <div className="grid min-h-svh md:grid-cols-[280px_1fr]">
          <Sidebar pendingRequestsCount={pendingRequestsCount} />
          <div className="flex min-w-0 flex-col">
            <Topbar assets={assets} orders={orders} requests={requests} />
            <MonthlyReminderBanner />
            <main className="flex-1">
              <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {children}
              </div>
            </main>
          </div>
        </div>
        <MonthlyPlanReconciler />
      </div>
    </InventoryProvider>
  );
}
