"use client";

import type { Asset } from "@/lib/fake-data";
import {
  getInventorySnapshot,
  subscribeInventory,
} from "@/lib/storage";
import { loadNotifications } from "@/features/settings/lib/notifications";

const READ_KEY = "invit:notifications-read:v1";
const DISMISSED_KEY = "invit:notifications-dismissed:v1";

export type NotifKind = "stock_out" | "stock_critical" | "stock_low";
export type NotifSeverity = "critical" | "low";

export type StockNotif = {
  id: string;
  kind: NotifKind;
  severity: NotifSeverity;
  asset: Asset;
};

export type NotificationsSnapshot = {
  visible: StockNotif[];
  readIds: ReadonlySet<string>;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

let readCache: Set<string> | null = null;
let dismissedCache: Set<string> | null = null;
let snapshotCache: NotificationsSnapshot | null = null;
const EMPTY_SNAPSHOT: NotificationsSnapshot = {
  visible: [],
  readIds: new Set<string>(),
};

function readSetFromStorage(key: string): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((s): s is string => typeof s === "string"));
  } catch {
    return new Set();
  }
}

function getReadIds(): Set<string> {
  if (readCache === null) readCache = readSetFromStorage(READ_KEY);
  return readCache;
}

function getDismissedIds(): Set<string> {
  if (dismissedCache === null)
    dismissedCache = readSetFromStorage(DISMISSED_KEY);
  return dismissedCache;
}

function persistReadIds(set: Set<string>) {
  readCache = set;
  if (!isBrowser()) return;
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...set]));
    window.dispatchEvent(new Event("invit:notifications-read-changed"));
  } catch {
    /* ignore quota */
  }
}

function persistDismissedIds(set: Set<string>) {
  dismissedCache = set;
  if (!isBrowser()) return;
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...set]));
    window.dispatchEvent(new Event("invit:notifications-read-changed"));
  } catch {
    /* ignore quota */
  }
}

function deriveVisible(): StockNotif[] {
  const inventory = getInventorySnapshot();
  const cfg = loadNotifications();
  const allowOut = cfg.channels["stock.out"]?.inapp ?? true;
  const allowCritical = cfg.channels["stock.critical"]?.inapp ?? true;
  const allowLow = cfg.channels["stock.low"]?.inapp ?? true;

  const raw: StockNotif[] = [];
  for (const a of inventory) {
    if (a.status === "out" && allowOut) {
      raw.push({
        id: `inv:${a.id}:out`,
        kind: "stock_out",
        severity: "critical",
        asset: a,
      });
    } else if (a.status === "critical" && allowCritical) {
      raw.push({
        id: `inv:${a.id}:critical`,
        kind: "stock_critical",
        severity: "critical",
        asset: a,
      });
    } else if (a.status === "low" && allowLow) {
      raw.push({
        id: `inv:${a.id}:low`,
        kind: "stock_low",
        severity: "low",
        asset: a,
      });
    }
  }

  // GC del set de dismissed: si la condición original ya no existe, sacamos
  // el id para que al volver a degradarse el item el aviso reaparezca.
  const dismissed = getDismissedIds();
  if (dismissed.size > 0) {
    const liveIds = new Set(raw.map((n) => n.id));
    let pruned = false;
    const next = new Set<string>();
    for (const id of dismissed) {
      if (liveIds.has(id)) next.add(id);
      else pruned = true;
    }
    if (pruned) persistDismissedIds(next);
  }

  const currentDismissed = getDismissedIds();
  const list = raw.filter((n) => !currentDismissed.has(n.id));

  list.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return a.asset.stock - b.asset.stock;
  });
  return list;
}

export function getNotificationsSnapshot(): NotificationsSnapshot {
  if (!isBrowser()) return EMPTY_SNAPSHOT;
  if (snapshotCache === null) {
    snapshotCache = {
      visible: deriveVisible(),
      readIds: getReadIds(),
    };
  }
  return snapshotCache;
}

export function getServerNotificationsSnapshot(): NotificationsSnapshot {
  return EMPTY_SNAPSHOT;
}

function invalidateSnapshot() {
  snapshotCache = null;
}

export function subscribeNotifications(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  const handler = () => {
    invalidateSnapshot();
    cb();
  };
  const unsubInventory = subscribeInventory(handler);
  window.addEventListener("invit:notifications-changed", handler);
  window.addEventListener("invit:notifications-read-changed", handler);
  return () => {
    unsubInventory();
    window.removeEventListener("invit:notifications-changed", handler);
    window.removeEventListener(
      "invit:notifications-read-changed",
      handler,
    );
  };
}

export function markRead(ids: string[]) {
  if (ids.length === 0) return;
  const set = new Set(getReadIds());
  let changed = false;
  for (const id of ids) {
    if (!set.has(id)) {
      set.add(id);
      changed = true;
    }
  }
  if (changed) persistReadIds(set);
}

export function markAllRead() {
  const { visible } = getNotificationsSnapshot();
  if (visible.length === 0) return;
  markRead(visible.map((n) => n.id));
}

/** Oculta todas las notificaciones visibles ahora. Se vuelven a mostrar
 *  cuando el item se recupera y degrada de nuevo (GC en deriveVisible). */
export function dismissAll() {
  const { visible } = getNotificationsSnapshot();
  if (visible.length === 0) return;
  const set = new Set(getDismissedIds());
  for (const n of visible) set.add(n.id);
  persistDismissedIds(set);
}

export function clearReadState() {
  persistReadIds(new Set());
}
