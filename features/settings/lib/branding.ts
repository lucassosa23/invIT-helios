"use client";

import { logAudit } from "./audit-log";

const KEY = "invit:branding:v1";

export type BrandAccent =
  | "indigo"
  | "violet"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "slate";

export type Branding = {
  accent: BrandAccent;
  density: "compact" | "comfortable";
  radius: "sharp" | "default" | "soft";
  emailFooter: string;
  emailSignature: string;
  brandShortName: string;
  brandLongName: string;
  logoMonogram: string;
};

export const DEFAULT_BRANDING: Branding = {
  accent: "indigo",
  density: "comfortable",
  radius: "default",
  emailFooter:
    "Helios Salud · Departamento de IT · sistemas@heliossalud.com.ar",
  emailSignature: "— Lucas Sosa\nResponsable de Sistemas\nHelios Salud",
  brandShortName: "invIT",
  brandLongName: "Helios Salud · invIT",
  logoMonogram: "HS",
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadBranding(): Branding {
  if (!isBrowser()) return DEFAULT_BRANDING;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_BRANDING;
    return { ...DEFAULT_BRANDING, ...(JSON.parse(raw) as Partial<Branding>) };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function saveBranding(b: Branding, audit = true) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
    window.dispatchEvent(new Event("invit:branding-changed"));
    if (audit) logAudit("branding.updated", `Accent: ${b.accent}`, b.density);
  } catch {
    /* ignore */
  }
}

export function subscribeBranding(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:branding-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:branding-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

export const ACCENT_SWATCH: Record<BrandAccent, { soft: string; solid: string; label: string }> = {
  indigo: { soft: "bg-indigo-500/15", solid: "bg-indigo-500", label: "Indigo" },
  violet: { soft: "bg-violet-500/15", solid: "bg-violet-500", label: "Violet" },
  sky: { soft: "bg-sky-500/15", solid: "bg-sky-500", label: "Sky" },
  emerald: { soft: "bg-emerald-500/15", solid: "bg-emerald-500", label: "Emerald" },
  amber: { soft: "bg-amber-500/15", solid: "bg-amber-500", label: "Amber" },
  rose: { soft: "bg-rose-500/15", solid: "bg-rose-500", label: "Rose" },
  slate: { soft: "bg-slate-500/15", solid: "bg-slate-500", label: "Slate" },
};
