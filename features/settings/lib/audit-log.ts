"use client";

export type AuditAction =
  | "workspace.updated"
  | "branding.updated"
  | "members.invited"
  | "members.removed"
  | "members.role_changed"
  | "categories.created"
  | "categories.updated"
  | "categories.deleted"
  | "inventory_rules.updated"
  | "notifications.updated"
  | "preferences.updated"
  | "security.updated"
  | "data.exported"
  | "data.imported"
  | "data.workspace_reset"
  | "audit.cleared";

export type AuditEntry = {
  id: string;
  action: AuditAction;
  actor: string;
  summary: string;
  meta?: string;
  at: Date;
};

const KEY = "invit:audit-log:v1";
const MAX_ENTRIES = 500;

type Stored = Omit<AuditEntry, "at"> & { at: string };

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadAuditLog(): AuditEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Stored[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((e) => ({ ...e, at: new Date(e.at) }));
  } catch {
    return [];
  }
}

function persist(entries: AuditEntry[]) {
  if (!isBrowser()) return;
  try {
    const sliced = entries.slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(sliced));
    window.dispatchEvent(new Event("invit:audit-log-changed"));
  } catch {
    /* ignore */
  }
}

export function logAudit(
  action: AuditAction,
  summary: string,
  meta?: string,
  actor = "Lucas Sosa",
) {
  if (!isBrowser()) return;
  const entry: AuditEntry = {
    id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    action,
    actor,
    summary,
    meta,
    at: new Date(),
  };
  const cur = loadAuditLog();
  persist([entry, ...cur]);
}

export function clearAuditLog() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("invit:audit-log-changed"));
}

export function subscribeAuditLog(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:audit-log-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:audit-log-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

export const ACTION_LABEL: Record<AuditAction, string> = {
  "workspace.updated": "Workspace actualizado",
  "branding.updated": "Branding actualizado",
  "members.invited": "Miembro invitado",
  "members.removed": "Miembro removido",
  "members.role_changed": "Rol cambiado",
  "categories.created": "Categoría creada",
  "categories.updated": "Categoría actualizada",
  "categories.deleted": "Categoría eliminada",
  "inventory_rules.updated": "Reglas de inventario actualizadas",
  "notifications.updated": "Notificaciones actualizadas",
  "preferences.updated": "Preferencias actualizadas",
  "security.updated": "Seguridad actualizada",
  "data.exported": "Datos exportados",
  "data.imported": "Datos importados",
  "data.workspace_reset": "Workspace reseteado",
  "audit.cleared": "Audit log purgado",
};

export const ACTION_KIND: Record<AuditAction, "info" | "warning" | "danger"> = {
  "workspace.updated": "info",
  "branding.updated": "info",
  "members.invited": "info",
  "members.removed": "warning",
  "members.role_changed": "info",
  "categories.created": "info",
  "categories.updated": "info",
  "categories.deleted": "warning",
  "inventory_rules.updated": "info",
  "notifications.updated": "info",
  "preferences.updated": "info",
  "security.updated": "warning",
  "data.exported": "info",
  "data.imported": "warning",
  "data.workspace_reset": "danger",
  "audit.cleared": "danger",
};
