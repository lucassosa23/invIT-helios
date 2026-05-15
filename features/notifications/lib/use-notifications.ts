"use client";

import { useMemo, useSyncExternalStore } from "react";

import {
  getNotificationsSnapshot,
  getServerNotificationsSnapshot,
  subscribeNotifications,
  type NotificationsSnapshot,
  type StockNotif,
} from "./notifications";

export function useNotifications(): NotificationsSnapshot {
  return useSyncExternalStore(
    subscribeNotifications,
    getNotificationsSnapshot,
    getServerNotificationsSnapshot,
  );
}

export function useUnreadCount(): number {
  const { visible, readIds } = useNotifications();
  return useMemo(
    () => visible.filter((n: StockNotif) => !readIds.has(n.id)).length,
    [visible, readIds],
  );
}
