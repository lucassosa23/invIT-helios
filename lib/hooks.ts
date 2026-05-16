"use client";

import { useSyncExternalStore } from "react";

export { useInventory } from "@/lib/inventory-context";

const noopSubscribe = () => () => {};

export function useIsMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
