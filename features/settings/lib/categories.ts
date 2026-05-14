"use client";

import { logAudit } from "./audit-log";

const KEY = "invit:categories:v1";

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  defaultThreshold: number;
  iconHint: string;
  trackWarranty: boolean;
  trackSerial: boolean;
  description?: string;
};

const DEFAULTS: Category[] = [
  { id: "cat_notebook", name: "Notebook", slug: "notebook", defaultThreshold: 6, iconHint: "Laptop", trackWarranty: true, trackSerial: true, description: "Laptops corporativas y workstation portátiles" },
  { id: "cat_monitor", name: "Monitor", slug: "monitor", defaultThreshold: 8, iconHint: "Monitor", trackWarranty: true, trackSerial: true },
  { id: "cat_keyboard", name: "Keyboard", slug: "keyboard", defaultThreshold: 12, iconHint: "Keyboard", trackWarranty: false, trackSerial: false },
  { id: "cat_mouse", name: "Mouse", slug: "mouse", defaultThreshold: 14, iconHint: "Mouse", trackWarranty: false, trackSerial: false },
  { id: "cat_ssd", name: "SSD", slug: "ssd", defaultThreshold: 10, iconHint: "HardDrive", trackWarranty: true, trackSerial: true },
  { id: "cat_hdd", name: "HDD", slug: "hdd", defaultThreshold: 6, iconHint: "HardDrive", trackWarranty: true, trackSerial: true },
  { id: "cat_ram", name: "RAM", slug: "ram", defaultThreshold: 8, iconHint: "Cpu", trackWarranty: true, trackSerial: false },
  { id: "cat_networking", name: "Networking", slug: "networking", defaultThreshold: 4, iconHint: "Network", trackWarranty: true, trackSerial: true },
  { id: "cat_cable", name: "Cable", slug: "cable", defaultThreshold: 20, iconHint: "Cable", trackWarranty: false, trackSerial: false },
  { id: "cat_tablet", name: "Tablet", slug: "tablet", defaultThreshold: 5, iconHint: "Tablet", trackWarranty: true, trackSerial: true },
  { id: "cat_webcam", name: "Webcam", slug: "webcam", defaultThreshold: 8, iconHint: "Camera", trackWarranty: false, trackSerial: false },
  { id: "cat_headset", name: "Headset", slug: "headset", defaultThreshold: 10, iconHint: "Headphones", trackWarranty: false, trackSerial: false },
  { id: "cat_printer", name: "Printer", slug: "printer", defaultThreshold: 3, iconHint: "Printer", trackWarranty: true, trackSerial: true },
  { id: "cat_dock", name: "Dock", slug: "dock", defaultThreshold: 6, iconHint: "Plug", trackWarranty: true, trackSerial: false },
  { id: "cat_ups", name: "UPS", slug: "ups", defaultThreshold: 4, iconHint: "BatteryCharging", trackWarranty: true, trackSerial: true },
];

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadCategories(): Category[] {
  if (!isBrowser()) return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(DEFAULTS));
      return DEFAULTS;
    }
    return JSON.parse(raw) as Category[];
  } catch {
    return DEFAULTS;
  }
}

export function saveCategories(categories: Category[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(categories));
    window.dispatchEvent(new Event("invit:categories-changed"));
  } catch {
    /* ignore */
  }
}

export function subscribeCategories(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:categories-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:categories-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createCategory(
  input: Omit<Category, "id" | "slug"> & { slug?: string },
): Category {
  const cur = loadCategories();
  const slug = input.slug ?? slugify(input.name);
  const id = `cat_${slug || Date.now().toString(36)}`;
  const next: Category = { id, slug, ...input };
  saveCategories([...cur, next]);
  logAudit("categories.created", next.name);
  return next;
}

export function updateCategory(id: string, patch: Partial<Category>) {
  const cur = loadCategories();
  const target = cur.find((c) => c.id === id);
  if (!target) return;
  const next = { ...target, ...patch };
  saveCategories(cur.map((c) => (c.id === id ? next : c)));
  logAudit("categories.updated", next.name);
}

export function deleteCategory(id: string) {
  const cur = loadCategories();
  const target = cur.find((c) => c.id === id);
  if (!target) return { ok: false as const };
  saveCategories(cur.filter((c) => c.id !== id));
  logAudit("categories.deleted", target.name);
  return { ok: true as const };
}
