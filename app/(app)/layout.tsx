import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { InventoryHydrator } from "@/features/inventory/components/inventory-hydrator";
import { getInventory } from "@/features/inventory/lib/queries";
import { MonthlyPlanReconciler } from "@/features/procurement/components/monthly-plan-reconciler";
import { OrdersHydrator } from "@/features/procurement/components/orders-hydrator";
import { getOrders } from "@/features/procurement/lib/queries";
import { MonthlyReminderBanner } from "@/features/reports/components/monthly-reminder-banner";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Inventory + orders se fetchean una vez por navegación. Los hydrators
  // bajan los datos a localStorage para que las features todavía no
  // migradas sigan funcionando con data fresca. Se borran cuando todo
  // procurement / requests / reports lea directo de la DB.
  const [assets, orders] = await Promise.all([getInventory(), getOrders()]);

  return (
    <div className="relative min-h-svh bg-background">
      <InventoryHydrator assets={assets} />
      <OrdersHydrator orders={orders} />
      <div className="grid min-h-svh md:grid-cols-[280px_1fr]">
        <Sidebar />
        <div className="flex min-w-0 flex-col">
          <Topbar assets={assets} />
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
  );
}
