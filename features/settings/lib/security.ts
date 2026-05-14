"use client";

import { logAudit } from "./audit-log";

const KEY = "invit:security:v1";

export type Security = {
  enforceMfa: boolean;
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  passwordRequireUpper: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  passwordRotationDays: number;
  ssoEnabled: boolean;
  ssoProvider: "okta" | "azure" | "google" | "none";
  ssoDomain: string;
  ipAllowlistEnabled: boolean;
  ipAllowlist: string[];
  auditRetentionDays: number;
  loginNotifications: boolean;
};

export const DEFAULT_SECURITY: Security = {
  enforceMfa: false,
  sessionTimeoutMinutes: 480,
  passwordMinLength: 12,
  passwordRequireUpper: true,
  passwordRequireNumber: true,
  passwordRequireSymbol: false,
  passwordRotationDays: 0,
  ssoEnabled: false,
  ssoProvider: "none",
  ssoDomain: "",
  ipAllowlistEnabled: false,
  ipAllowlist: [],
  auditRetentionDays: 365,
  loginNotifications: true,
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadSecurity(): Security {
  if (!isBrowser()) return DEFAULT_SECURITY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SECURITY;
    return { ...DEFAULT_SECURITY, ...(JSON.parse(raw) as Partial<Security>) };
  } catch {
    return DEFAULT_SECURITY;
  }
}

export function saveSecurity(s: Security, audit = true) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event("invit:security-changed"));
    if (audit) {
      logAudit(
        "security.updated",
        `MFA: ${s.enforceMfa ? "obligatorio" : "opcional"} · SSO: ${s.ssoEnabled ? s.ssoProvider : "off"}`,
      );
    }
  } catch {
    /* ignore */
  }
}
