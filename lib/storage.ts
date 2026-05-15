"use client";

import type { Asset } from "@/lib/fake-data";

const KEY_INVENTORY = "invit:inventory:v1";

type StoredAsset = Omit<Asset, "warrantyExpiresAt" | "updatedAt"> & {
  warrantyExpiresAt: string;
  updatedAt: string;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

const EMPTY_INVENTORY: Asset[] = [];
let snapshotCache: Asset[] | null = null;

function readFromStorage(): Asset[] | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(KEY_INVENTORY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAsset[];
    if (!Array.isArray(parsed)) return null;
    return parsed.map((a) => ({
      ...a,
      warrantyExpiresAt: new Date(a.warrantyExpiresAt),
      updatedAt: new Date(a.updatedAt),
    }));
  } catch {
    return null;
  }
}

export function loadInventory(): Asset[] | null {
  return readFromStorage();
}

export function getInventorySnapshot(): Asset[] {
  if (!isBrowser()) return EMPTY_INVENTORY;
  if (snapshotCache === null) {
    snapshotCache = readFromStorage() ?? EMPTY_INVENTORY;
  }
  return snapshotCache;
}

export function getServerInventorySnapshot(): Asset[] {
  return EMPTY_INVENTORY;
}

function invalidateSnapshot() {
  snapshotCache = null;
}

export function saveInventory(assets: Asset[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY_INVENTORY, JSON.stringify(assets));
    invalidateSnapshot();
    window.dispatchEvent(new Event("invit:inventory-changed"));
  } catch {
    /* ignore quota errors */
  }
}

export function clearInventory() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEY_INVENTORY);
  invalidateSnapshot();
  window.dispatchEvent(new Event("invit:inventory-changed"));
}

export function subscribeInventory(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => {
    invalidateSnapshot();
    cb();
  };
  window.addEventListener("invit:inventory-changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("invit:inventory-changed", handler);
    window.removeEventListener("storage", handler);
  };
}
