"use client";

import { logAudit } from "./audit-log";

const KEY = "invit:workspace:v1";

export type Workspace = {
  name: string;
  slug: string;
  legalName: string;
  taxId: string;
  industry: string;
  size: string;
  website: string;
  supportEmail: string;
  timezone: string;
  locale: string;
  currency: "USD" | "ARS" | "EUR" | "BRL" | "CLP" | "MXN" | "UYU";
  dateFormat: "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd";
  weekStart: "monday" | "sunday";
  fiscalYearStartMonth: number;
  description: string;
};

export const DEFAULT_WORKSPACE: Workspace = {
  name: "Helios Salud",
  slug: "helios-salud",
  legalName: "Helios Salud S.A.",
  taxId: "30-12345678-9",
  industry: "Salud",
  size: "201-500",
  website: "https://heliossalud.com.ar",
  supportEmail: "sistemas@heliossalud.com.ar",
  timezone: "America/Argentina/Buenos_Aires",
  locale: "es-AR",
  currency: "USD",
  dateFormat: "dd/MM/yyyy",
  weekStart: "monday",
  fiscalYearStartMonth: 1,
  description:
    "Workspace operativo del departamento de IT de Helios Salud. Inventario, compras y pedidos internos.",
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadWorkspace(): Workspace {
  if (!isBrowser()) return DEFAULT_WORKSPACE;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_WORKSPACE;
    return { ...DEFAULT_WORKSPACE, ...(JSON.parse(raw) as Partial<Workspace>) };
  } catch {
    return DEFAULT_WORKSPACE;
  }
}

export function saveWorkspace(ws: Workspace, audit = true) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(ws));
    window.dispatchEvent(new Event("invit:workspace-changed"));
    if (audit) {
      logAudit(
        "workspace.updated",
        `${ws.name} · ${ws.slug}`,
        `${ws.locale} · ${ws.currency} · ${ws.timezone}`,
      );
    }
  } catch {
    /* ignore */
  }
}

export function subscribeWorkspace(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:workspace-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:workspace-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

export const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Argentina/Cordoba",
  "America/Sao_Paulo",
  "America/Santiago",
  "America/Montevideo",
  "America/Mexico_City",
  "America/Lima",
  "America/Bogota",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "Europe/London",
  "UTC",
];

export const LOCALES: Array<{ id: string; label: string }> = [
  { id: "es-AR", label: "Español (Argentina)" },
  { id: "es-ES", label: "Español (España)" },
  { id: "es-MX", label: "Español (México)" },
  { id: "pt-BR", label: "Português (Brasil)" },
  { id: "en-US", label: "English (United States)" },
  { id: "en-GB", label: "English (United Kingdom)" },
];

export const CURRENCIES: Array<{ id: Workspace["currency"]; label: string }> = [
  { id: "USD", label: "US Dollar (USD)" },
  { id: "ARS", label: "Peso argentino (ARS)" },
  { id: "EUR", label: "Euro (EUR)" },
  { id: "BRL", label: "Real brasileño (BRL)" },
  { id: "CLP", label: "Peso chileno (CLP)" },
  { id: "MXN", label: "Peso mexicano (MXN)" },
  { id: "UYU", label: "Peso uruguayo (UYU)" },
];

export const INDUSTRIES = [
  "Salud",
  "Tecnología",
  "Educación",
  "Manufactura",
  "Retail",
  "Servicios Financieros",
  "Gobierno",
  "Logística",
  "Otro",
];

export const WORKSPACE_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001+",
];

export const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
