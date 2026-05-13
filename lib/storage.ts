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

export function loadInventory(): Asset[] | null {
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

export function saveInventory(assets: Asset[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY_INVENTORY, JSON.stringify(assets));
    window.dispatchEvent(new Event("invit:inventory-changed"));
  } catch {
    /* ignore quota errors */
  }
}

export function clearInventory() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEY_INVENTORY);
  window.dispatchEvent(new Event("invit:inventory-changed"));
}

export function subscribeInventory(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:inventory-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:inventory-changed", cb);
    window.removeEventListener("storage", cb);
  };
}
