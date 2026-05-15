"use client";

import { useMemo, useSyncExternalStore } from "react";

import type { Asset } from "@/lib/fake-data";

import {
  computeNotificationsState,
  subscribeNotificationsState,
  type NotificationsState,
  type StockNotif,
} from "./notifications";

/** Bumps que sirven como "tick" para invalidar el snapshot cuando
 *  cambia la config o el set de read/dismissed. Sin esto useSyncExternalStore
 *  no detectaría que algo del lado cliente cambió, porque la derivación
 *  depende de localStorage y no de su input. */
let tick = 0;

function getServerSnapshot(): number {
  return 0;
}

function bump() {
  tick = (tick + 1) | 0;
}

function subscribe(cb: () => void): () => void {
  const wrapped = () => {
    bump();
    cb();
  };
  return subscribeNotificationsState(wrapped);
}

function getSnapshot(): number {
  return tick;
}

export function useNotifications(assets: Asset[]): NotificationsState {
  // Forzamos re-render cuando cambia el tick (settings o read/dismissed).
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return useMemo<NotificationsState>(
    () => computeNotificationsState(assets),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assets, tick],
  );
}

export function useUnreadCount(assets: Asset[]): number {
  const { visible, readIds } = useNotifications(assets);
  return useMemo(
    () => visible.filter((n: StockNotif) => !readIds.has(n.id)).length,
    [visible, readIds],
  );
}
