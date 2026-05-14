"use client";

import { logAudit } from "./audit-log";

const KEY = "invit:preferences:v1";

export type Density = "compact" | "comfortable" | "cozy";
export type DefaultPage = "/dashboard" | "/inventory" | "/procurement" | "/requests" | "/reports";

export type Preferences = {
  defaultPage: DefaultPage;
  density: Density;
  animations: boolean;
  reducedMotion: boolean;
  showKeyboardHints: boolean;
  showActivityBanner: boolean;
  sidebarPinned: boolean;
  numberGrouping: boolean;
  showSidebarBadges: boolean;
  autoOpenCommandOnFocus: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  defaultPage: "/dashboard",
  density: "comfortable",
  animations: true,
  reducedMotion: false,
  showKeyboardHints: true,
  showActivityBanner: true,
  sidebarPinned: true,
  numberGrouping: true,
  showSidebarBadges: true,
  autoOpenCommandOnFocus: false,
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadPreferences(): Preferences {
  if (!isBrowser()) return DEFAULT_PREFERENCES;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: Preferences, audit = true) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    window.dispatchEvent(new Event("invit:preferences-changed"));
    if (audit) logAudit("preferences.updated", `Density: ${prefs.density}`);
  } catch {
    /* ignore */
  }
}

export function subscribePreferences(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:preferences-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:preferences-changed", cb);
    window.removeEventListener("storage", cb);
  };
}
