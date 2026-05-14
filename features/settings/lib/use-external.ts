"use client";

import { useSyncExternalStore } from "react";

/**
 * Adaptador genérico para nuestras "stores" basadas en localStorage +
 * eventos de window. Resuelve el lint `react-hooks/set-state-in-effect`
 * y también el problema de hydration mismatch (durante SSR usa el
 * snapshot del servidor).
 */
export function useExternalStore<T>(
  subscribe: (cb: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot: () => T,
): T {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
