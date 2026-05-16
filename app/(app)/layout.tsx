import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getInventory } from "@/features/inventory/lib/queries";
import { MonthlyPlanReconciler } from "@/features/procurement/components/monthly-plan-reconciler";
import { getPendingRequestsCount } from "@/features/requests/lib/queries";
import { MonthlyReminderBanner } from "@/features/reports/components/monthly-reminder-banner";
import { InventoryProvider } from "@/lib/inventory-context";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout solo carga lo imprescindible:
  // - `assets` para el InventoryProvider (los dialogs de cualquier ruta
  //   leen el inventory por contexto).
  // - `pendingRequestsCount` para el badge del sidebar (un count de DB,
  //   no traemos rows completos).
  // El TopbarSearch carga sus datos lazy al abrirse, así no pagamos
  // listas completas de orders/requests en cada navegación.
  const [assets, pendingRequestsCount] = await Promise.all([
    getInventory(),
    getPendingRequestsCount(),
  ]);

  return (
    <InventoryProvider value={assets}>
      <div className="relative min-h-svh bg-background">
        <div className="grid min-h-svh md:grid-cols-[280px_1fr]">
          <Sidebar pendingRequestsCount={pendingRequestsCount} />
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
    </InventoryProvider>
  );
}
