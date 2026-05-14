"use client";

import { logAudit } from "./audit-log";

const KEY = "invit:members:v1";

export type Role = "owner" | "admin" | "operator" | "viewer";

export type MemberStatus = "active" | "invited" | "suspended";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  team: string;
  status: MemberStatus;
  invitedAt?: Date;
  joinedAt?: Date;
  lastActiveAt?: Date;
  twoFactor: boolean;
};

type Stored = Omit<Member, "invitedAt" | "joinedAt" | "lastActiveAt"> & {
  invitedAt?: string;
  joinedAt?: string;
  lastActiveAt?: string;
};

const DEFAULT_MEMBERS: Member[] = [
  {
    id: "mbr_001",
    name: "Lucas Sosa",
    email: "sistemas@heliossalud.com.ar",
    role: "owner",
    team: "Sistemas",
    status: "active",
    joinedAt: new Date("2024-01-15T10:00:00Z"),
    lastActiveAt: new Date(),
    twoFactor: true,
  },
  {
    id: "mbr_002",
    name: "Mariano Ferreyra",
    email: "mferreyra@heliossalud.com.ar",
    role: "admin",
    team: "Soporte IT",
    status: "active",
    joinedAt: new Date("2024-03-04T09:00:00Z"),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    twoFactor: true,
  },
  {
    id: "mbr_003",
    name: "Camila Rivero",
    email: "crivero@heliossalud.com.ar",
    role: "operator",
    team: "Soporte IT",
    status: "active",
    joinedAt: new Date("2024-06-20T09:00:00Z"),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 22),
    twoFactor: false,
  },
  {
    id: "mbr_004",
    name: "Florencia Méndez",
    email: "fmendez@heliossalud.com.ar",
    role: "viewer",
    team: "Administración",
    status: "active",
    joinedAt: new Date("2025-02-10T09:00:00Z"),
    lastActiveAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    twoFactor: false,
  },
  {
    id: "mbr_005",
    name: "Tomás Aguirre",
    email: "taguirre@heliossalud.com.ar",
    role: "operator",
    team: "Desarrollo",
    status: "invited",
    invitedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    twoFactor: false,
  },
];

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function hydrate(arr: Stored[]): Member[] {
  return arr.map((m) => ({
    ...m,
    invitedAt: m.invitedAt ? new Date(m.invitedAt) : undefined,
    joinedAt: m.joinedAt ? new Date(m.joinedAt) : undefined,
    lastActiveAt: m.lastActiveAt ? new Date(m.lastActiveAt) : undefined,
  }));
}

export function loadMembers(): Member[] {
  if (!isBrowser()) return DEFAULT_MEMBERS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(DEFAULT_MEMBERS));
      return DEFAULT_MEMBERS;
    }
    return hydrate(JSON.parse(raw) as Stored[]);
  } catch {
    return DEFAULT_MEMBERS;
  }
}

export function saveMembers(members: Member[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(members));
    window.dispatchEvent(new Event("invit:members-changed"));
  } catch {
    /* ignore */
  }
}

export function subscribeMembers(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:members-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:members-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

export function inviteMember(email: string, role: Role, team: string) {
  const cur = loadMembers();
  if (cur.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false as const, reason: "Ya existe un miembro con ese email." };
  }
  const name = email.split("@")[0]?.replace(/[._-]/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()) ?? email;
  const next: Member = {
    id: `mbr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    email,
    role,
    team,
    status: "invited",
    invitedAt: new Date(),
    twoFactor: false,
  };
  saveMembers([next, ...cur]);
  logAudit("members.invited", email, `Rol: ${ROLE_LABEL[role]}`);
  return { ok: true as const, member: next };
}

export function removeMember(id: string) {
  const cur = loadMembers();
  const target = cur.find((m) => m.id === id);
  if (!target) return { ok: false as const };
  if (target.role === "owner") return { ok: false as const, reason: "No se puede eliminar al owner." };
  saveMembers(cur.filter((m) => m.id !== id));
  logAudit("members.removed", target.email);
  return { ok: true as const };
}

export function changeRole(id: string, role: Role) {
  const cur = loadMembers();
  const target = cur.find((m) => m.id === id);
  if (!target) return { ok: false as const };
  saveMembers(cur.map((m) => (m.id === id ? { ...m, role } : m)));
  logAudit(
    "members.role_changed",
    target.email,
    `${ROLE_LABEL[target.role]} → ${ROLE_LABEL[role]}`,
  );
  return { ok: true as const };
}

export function suspendMember(id: string, suspended: boolean) {
  const cur = loadMembers();
  saveMembers(
    cur.map((m) =>
      m.id === id ? { ...m, status: suspended ? "suspended" : "active" } : m,
    ),
  );
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  operator: "Operador",
  viewer: "Solo lectura",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  owner: "Control total · facturación · eliminar workspace",
  admin: "Configurar workspace · invitar miembros · gestionar todo",
  operator: "Operar inventario, compras y pedidos · sin ajustes",
  viewer: "Acceso de solo lectura a dashboards y reportes",
};

export const STATUS_LABEL: Record<MemberStatus, string> = {
  active: "Activo",
  invited: "Invitado",
  suspended: "Suspendido",
};
