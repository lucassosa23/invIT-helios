import {
  AlertOctagon,
  AppWindow,
  Bell,
  Building2,
  Database,
  FileClock,
  Layers,
  Mail,
  Palette,
  ScrollText,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type SettingsSectionId =
  | "general"
  | "branding"
  | "members"
  | "categories"
  | "inventory"
  | "notifications"
  | "audit"
  | "profile"
  | "preferences"
  | "security"
  | "data"
  | "danger";

export type SettingsSection = {
  id: SettingsSectionId;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  group: "workspace" | "operación" | "comunicación" | "cuenta" | "avanzado";
  keywords?: string[];
  badge?: "soon" | "new" | "danger";
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: "general",
    href: "/settings/general",
    label: "General",
    description: "Identidad del workspace, zona horaria y moneda.",
    icon: SettingsIcon,
    group: "workspace",
    keywords: ["workspace", "identidad", "razón social", "tax", "cuit", "timezone", "locale"],
  },
  {
    id: "branding",
    href: "/settings/branding",
    label: "Branding",
    description: "Logo, color de acento y firma de emails.",
    icon: Palette,
    group: "workspace",
    keywords: ["color", "tema", "logo", "marca"],
  },
  {
    id: "members",
    href: "/settings/members",
    label: "Miembros",
    description: "Invitar usuarios, asignar roles y permisos.",
    icon: Users,
    group: "workspace",
    keywords: ["usuarios", "permisos", "rol", "admin", "operador"],
  },
  {
    id: "categories",
    href: "/settings/categories",
    label: "Categorías",
    description: "Taxonomía de items con reglas por categoría.",
    icon: Layers,
    group: "operación",
    keywords: ["taxonomía", "tipo", "clasificación"],
  },
  {
    id: "inventory",
    href: "/settings/inventory",
    label: "Reglas de inventario",
    description: "Umbrales, SKU, garantía y validaciones por defecto.",
    icon: Wrench,
    group: "operación",
    keywords: ["umbral", "sku", "garantía", "stock seguro"],
  },
  {
    id: "notifications",
    href: "/settings/notifications",
    label: "Notificaciones",
    description: "Alertas operativas por canal y horario.",
    icon: Bell,
    group: "comunicación",
    keywords: ["email", "slack", "alerta", "digest"],
  },
  {
    id: "audit",
    href: "/settings/audit",
    label: "Audit log",
    description: "Registro inmutable de cambios administrativos.",
    icon: FileClock,
    group: "avanzado",
    keywords: ["audit", "historial", "log"],
  },
  {
    id: "profile",
    href: "/settings/profile",
    label: "Mi perfil",
    description: "Tu información personal y firma.",
    icon: User,
    group: "cuenta",
    keywords: ["nombre", "email", "personal"],
  },
  {
    id: "preferences",
    href: "/settings/preferences",
    label: "Preferencias",
    description: "Tema, densidad y atajos de teclado.",
    icon: Sparkles,
    group: "cuenta",
    keywords: ["tema", "densidad", "shortcuts"],
  },
  {
    id: "security",
    href: "/settings/security",
    label: "Seguridad",
    description: "MFA, SSO, contraseñas e IP allowlist.",
    icon: ShieldCheck,
    group: "avanzado",
    keywords: ["mfa", "sso", "2fa", "saml", "okta", "azure"],
  },
  {
    id: "data",
    href: "/settings/data",
    label: "Datos y respaldos",
    description: "Exportar, importar y limpiar el workspace.",
    icon: Database,
    group: "avanzado",
    keywords: ["export", "import", "backup", "csv", "json"],
  },
  {
    id: "danger",
    href: "/settings/danger",
    label: "Zona de peligro",
    description: "Reset y eliminación del workspace.",
    icon: AlertOctagon,
    group: "avanzado",
    badge: "danger",
    keywords: ["reset", "delete", "borrar"],
  },
];

export const SETTINGS_GROUPS: Array<{
  id: SettingsSection["group"];
  label: string;
}> = [
  { id: "workspace", label: "Workspace" },
  { id: "operación", label: "Operación" },
  { id: "comunicación", label: "Comunicación" },
  { id: "cuenta", label: "Cuenta" },
  { id: "avanzado", label: "Avanzado" },
];

export function findSection(id: string): SettingsSection | undefined {
  return SETTINGS_SECTIONS.find((s) => s.id === id);
}

export { AppWindow, Building2, Mail, ScrollText };
