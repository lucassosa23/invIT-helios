"use client";

import { useSyncExternalStore } from "react";

import {
  getInventorySnapshot,
  getServerInventorySnapshot,
  subscribeInventory,
} from "@/lib/storage";
import type { Asset } from "@/lib/fake-data";

export function useInventory(): Asset[] {
  return useSyncExternalStore(
    subscribeInventory,
    getInventorySnapshot,
    getServerInventorySnapshot,
  );
}

const noopSubscribe = () => () => {};

export function useIsMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
