"use client";

import { useEffect } from "react";

import type { Asset } from "@/lib/fake-data";
import { saveInventory } from "@/lib/storage";

type Props = {
  assets: Asset[];
};

/** Shim transitorio: sincroniza `localStorage` con la inventory de la DB
 *  en cada navegación. Mientras migramos las otras features (procurement,
 *  requests, reports, búsqueda, command palette) que todavía leen de
 *  localStorage, este componente las mantiene mirando data fresca.
 *
 *  Cuando todas esas features lean directo de la DB, este archivo y
 *  `lib/storage.ts` se borran. */
export function InventoryHydrator({ assets }: Props) {
  useEffect(() => {
    saveInventory(assets);
  }, [assets]);

  return null;
}
