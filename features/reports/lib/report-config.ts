"use client";

const KEY_CONFIG = "invit:email-config:v1";
const KEY_EXCLUSIONS = "invit:email-exclusions:v1";
const KEY_LAST_SENT = "invit:email-last-sent:v1";

export type SectionToggles = {
  inventory: boolean; // items críticos / agotados / bajo umbral
  plan: boolean; // plan de compras del mes
  readyOrders: boolean; // órdenes status=ready listas para enviar
  pendingRequests: boolean; // pedidos internos sin resolver
};

export type ReportConfig = {
  recipients: string[];
  sections: SectionToggles;
};

const DEFAULT_CONFIG: ReportConfig = {
  recipients: ["sistemas@heliossalud.com.ar"],
  sections: {
    inventory: true,
    plan: true,
    readyOrders: true,
    pendingRequests: true,
  },
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadConfig(): ReportConfig {
  if (!isBrowser()) return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(KEY_CONFIG);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ReportConfig>;
    return {
      recipients: Array.isArray(parsed.recipients)
        ? parsed.recipients.filter((s): s is string => typeof s === "string")
        : DEFAULT_CONFIG.recipients,
      sections: {
        ...DEFAULT_CONFIG.sections,
        ...(parsed.sections ?? {}),
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: ReportConfig) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY_CONFIG, JSON.stringify(config));
    window.dispatchEvent(new Event("invit:email-config-changed"));
  } catch {
    /* ignore */
  }
}

export function subscribeConfig(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:email-config-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:email-config-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

// ─── Exclusiones (items individuales que no entran al reporte) ──────────

type ExclusionRecord = Record<string, true>;

export function loadExclusions(): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = localStorage.getItem(KEY_EXCLUSIONS);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as ExclusionRecord;
    return new Set(Object.keys(parsed));
  } catch {
    return new Set();
  }
}

export function saveExclusions(ids: Set<string>) {
  if (!isBrowser()) return;
  try {
    const rec: ExclusionRecord = {};
    for (const id of ids) rec[id] = true;
    localStorage.setItem(KEY_EXCLUSIONS, JSON.stringify(rec));
    window.dispatchEvent(new Event("invit:email-exclusions-changed"));
  } catch {
    /* ignore */
  }
}

export function subscribeExclusions(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:email-exclusions-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:email-exclusions-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

export function toggleExclusion(id: string, excluded: boolean) {
  const cur = loadExclusions();
  if (excluded) cur.add(id);
  else cur.delete(id);
  saveExclusions(cur);
}

export function clearExclusions() {
  saveExclusions(new Set());
}

// ─── Último envío (para no molestar dos veces el mismo mes) ─────────────

export function loadLastSentMonth(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(KEY_LAST_SENT);
  } catch {
    return null;
  }
}

export function markSentThisMonth() {
  if (!isBrowser()) return;
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  localStorage.setItem(KEY_LAST_SENT, key);
  window.dispatchEvent(new Event("invit:email-last-sent-changed"));
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** ¿Estamos en (o después de) el día 1 del mes y todavía no se mandó? */
export function shouldRemindForMonthlyReport(): boolean {
  if (!isBrowser()) return false;
  const today = new Date();
  // Recordar desde el día 1 hasta el día 5 del mes (ventana de envío)
  if (today.getDate() > 5) return false;
  const last = loadLastSentMonth();
  return last !== currentMonthKey();
}
