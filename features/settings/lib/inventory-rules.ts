"use client";

import { logAudit } from "./audit-log";

const KEY = "invit:inventory-rules:v1";

export type SkuStrategy = "category-brand-seq" | "category-seq" | "free";

export type InventoryRules = {
  defaultThreshold: number;
  criticalMultiplier: number;
  warrantyAlertDays: number;
  autoStatusUpdate: boolean;
  skuStrategy: SkuStrategy;
  skuPrefix: string;
  requireBrand: boolean;
  requireLocation: boolean;
  requireWarranty: boolean;
  requireSerial: boolean;
  allowNegativeStock: boolean;
  blockBelowSafetyStock: boolean;
  safetyStock: number;
  monthlyPlanDay: number;
  procurementApprovalRequired: boolean;
  procurementApprovalThresholdUsd: number;
};

export const DEFAULT_RULES: InventoryRules = {
  defaultThreshold: 8,
  criticalMultiplier: 0.4,
  warrantyAlertDays: 90,
  autoStatusUpdate: true,
  skuStrategy: "category-brand-seq",
  skuPrefix: "",
  requireBrand: true,
  requireLocation: true,
  requireWarranty: false,
  requireSerial: false,
  allowNegativeStock: false,
  blockBelowSafetyStock: false,
  safetyStock: 0,
  monthlyPlanDay: 1,
  procurementApprovalRequired: false,
  procurementApprovalThresholdUsd: 1000,
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadRules(): InventoryRules {
  if (!isBrowser()) return DEFAULT_RULES;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_RULES;
    return { ...DEFAULT_RULES, ...(JSON.parse(raw) as Partial<InventoryRules>) };
  } catch {
    return DEFAULT_RULES;
  }
}

export function saveRules(rules: InventoryRules, audit = true) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(rules));
    window.dispatchEvent(new Event("invit:inventory-rules-changed"));
    if (audit) {
      logAudit(
        "inventory_rules.updated",
        `Umbral por defecto: ${rules.defaultThreshold}`,
        `Crítico ${Math.round(rules.criticalMultiplier * 100)}% · Garantía ${rules.warrantyAlertDays}d`,
      );
    }
  } catch {
    /* ignore */
  }
}

export function subscribeRules(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:inventory-rules-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:inventory-rules-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

export const SKU_STRATEGY_LABEL: Record<SkuStrategy, string> = {
  "category-brand-seq": "CAT-BRA-0001 (categoría · marca · secuencia)",
  "category-seq": "CAT-0001 (categoría · secuencia)",
  free: "Libre (manual)",
};
