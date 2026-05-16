import {
  Activity,
  BarChart3,
  Boxes,
  Inbox,
  LayoutDashboard,
  Mail,
  ScanBarcode,
  Settings,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  shortcut?: string;
  badge?: string | number;
};

export type NavSection = {
  label?: string;
  items: NavItem[];
};

export const primaryNav: NavSection[] = [
  {
    items: [
      {
        label: "Inicio",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "Resumen y alertas del día",
        shortcut: "G I",
      },
    ],
  },
  {
    label: "Operación",
    items: [
      {
        label: "Inventario",
        href: "/inventory",
        icon: Boxes,
        description: "Stock, ubicaciones y garantías",
        shortcut: "G V",
      },
      {
        label: "Compras",
        href: "/procurement",
        icon: ShoppingBag,
        description: "Plan de compras mensual",
        shortcut: "G C",
      },
      {
        label: "Pedidos",
        href: "/requests",
        icon: Inbox,
        description: "Solicitudes internas de hardware",
        shortcut: "G P",
      },
      {
        label: "Escaneo",
        href: "/scan",
        icon: ScanBarcode,
        description: "Cargá altas y bajas con la pistola",
        shortcut: "G E",
      },
      {
        label: "Reporte mensual",
        href: "/reports",
        icon: Mail,
        description: "Email del mes con compras y stock",
        shortcut: "G M",
      },
    ],
  },
  {
    label: "Información",
    items: [
      {
        label: "Reportes",
        href: "/analytics",
        icon: BarChart3,
        description: "Tendencias y métricas",
        shortcut: "G R",
      },
      {
        label: "Actividad",
        href: "/activity",
        icon: Activity,
        description: "Registro operativo completo",
        shortcut: "G A",
      },
    ],
  },
  {
    items: [
      {
        label: "Ajustes",
        href: "/settings",
        icon: Settings,
        description: "Preferencias del workspace",
        shortcut: "G S",
      },
    ],
  },
];

export const flatNav: NavItem[] = primaryNav.flatMap((s) => s.items);

export function findActiveNav(pathname: string): NavItem | undefined {
  return flatNav.find(
    (item) =>
      pathname === item.href || pathname.startsWith(item.href + "/"),
  );
}
