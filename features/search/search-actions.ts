"use server";

import { requireUser } from "@/lib/auth/current-user";
import { getInventory } from "@/features/inventory/lib/queries";
import { getOrders } from "@/features/procurement/lib/queries";
import { getRequests } from "@/features/requests/lib/queries";

export type SearchPayload = {
  inventory: Awaited<ReturnType<typeof getInventory>>;
  orders: Awaited<ReturnType<typeof getOrders>>;
  requests: Awaited<ReturnType<typeof getRequests>>;
};

/** Carga lazy de los datos del topbar search. Se llama solo cuando el
 *  usuario abre la barra de búsqueda, no en cada navegación. */
export async function loadSearchPayloadAction(): Promise<SearchPayload> {
  await requireUser();
  const [inventory, orders, requests] = await Promise.all([
    getInventory(),
    getOrders(),
    getRequests(),
  ]);
  return { inventory, orders, requests };
}
