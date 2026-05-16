"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Asset } from "@/lib/fake-data";

const InventoryContext = createContext<Asset[] | null>(null);

export function InventoryProvider({
  value,
  children,
}: {
  value: Asset[];
  children: ReactNode;
}) {
  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

/** Lee el inventario fresco desde el contexto del layout. Devuelve [] si
 *  se llama fuera del provider (defensivo). */
export function useInventory(): Asset[] {
  return useContext(InventoryContext) ?? [];
}
