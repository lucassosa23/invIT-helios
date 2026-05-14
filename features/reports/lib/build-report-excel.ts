"use client";

import * as XLSX from "xlsx";

import {
  statusFromStock,
  type Asset,
  type Location,
} from "@/lib/fake-data";
import type { PurchaseOrder } from "@/features/procurement/lib/orders";
import type { InternalRequest } from "@/features/requests/lib/requests";

import type { SectionToggles } from "./report-config";

type Opts = {
  monthLabel: string;
  sections: SectionToggles;
  items: Asset[];
  plan?: PurchaseOrder;
  readyOrders: PurchaseOrder[];
  pendingRequests: InternalRequest[];
  locations: Location[];
};

const STATUS_LABEL: Record<string, string> = {
  healthy: "Disponible",
  low: "Bajo",
  critical: "Crítico",
  out: "Agotado",
};

const REQ_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  awaiting_purchase: "Esperando compra",
  ready_to_deliver: "Listo para entregar",
  delivered: "Entregado",
  rejected: "Rechazado",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

function autoFilter(ws: XLSX.WorkSheet, lastCol: string, rowCount: number) {
  if (rowCount === 0) return;
  ws["!autofilter"] = { ref: `A1:${lastCol}${rowCount + 1}` };
}

function freezeHeader(ws: XLSX.WorkSheet) {
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
}

function buildSummary(opts: Opts): XLSX.WorkSheet {
  const rows: (string | number)[][] = [
    ["REPORTE MENSUAL DE INVENTARIO Y COMPRAS"],
    [`Período: ${opts.monthLabel}`],
    [`Generado: ${new Date().toLocaleString("es-AR")}`],
    [],
  ];

  if (opts.sections.inventory) {
    const critical = opts.items.filter(
      (a) => a.status === "critical" || a.status === "out",
    ).length;
    const low = opts.items.filter((a) => a.status === "low").length;
    rows.push(
      ["INVENTARIO BAJO UMBRAL"],
      ["  Items críticos / agotados", critical],
      ["  Items bajo umbral", low],
      ["  Total", opts.items.length],
      [],
    );
  }

  if (opts.sections.plan && opts.plan) {
    const totalUnits = opts.plan.lines.reduce((s, l) => s + l.qty, 0);
    rows.push(
      ["PLAN DE COMPRAS DEL MES"],
      ["  Referencia", opts.plan.reference],
      ["  Items distintos", opts.plan.lines.length],
      ["  Unidades totales", totalUnits],
      [],
    );
  }

  if (opts.sections.readyOrders && opts.readyOrders.length > 0) {
    const totalItems = opts.readyOrders.reduce(
      (s, o) => s + o.lines.length,
      0,
    );
    const totalUnits = opts.readyOrders.reduce(
      (s, o) => s + o.lines.reduce((s2, l) => s2 + l.qty, 0),
      0,
    );
    rows.push(
      ["ÓRDENES LISTAS PARA ENVIAR"],
      ["  Órdenes", opts.readyOrders.length],
      ["  Items distintos", totalItems],
      ["  Unidades totales", totalUnits],
      [],
    );
  }

  if (opts.sections.pendingRequests && opts.pendingRequests.length > 0) {
    const pending = opts.pendingRequests.filter(
      (r) => r.status === "pending",
    ).length;
    const awaiting = opts.pendingRequests.filter(
      (r) => r.status === "awaiting_purchase",
    ).length;
    rows.push(
      ["PEDIDOS DEL EQUIPO SIN RESOLVER"],
      ["  Por decidir", pending],
      ["  Esperando compra", awaiting],
      ["  Total", opts.pendingRequests.length],
      [],
    );
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 42 }, { wch: 16 }];
  return ws;
}

function buildInventorySheet(
  items: Asset[],
  locations: Location[],
): XLSX.WorkSheet {
  const locationMap = Object.fromEntries(
    locations.map((l) => [l.id, l.name]),
  );
  const sorted = [...items].sort((a, b) => {
    const rank = (s: Asset["status"]) =>
      s === "critical" ? 0 : s === "out" ? 1 : s === "low" ? 2 : 3;
    return (
      rank(statusFromStock(a.stock, a.threshold)) -
        rank(statusFromStock(b.stock, b.threshold)) ||
      a.category.localeCompare(b.category, "es") ||
      a.name.localeCompare(b.name, "es")
    );
  });

  const rows = sorted.map((a) => ({
    Código: a.sku,
    Nombre: a.name,
    Marca: a.brand,
    Categoría: a.category,
    "Cantidad actual": a.stock,
    "Cantidad mínima": a.threshold,
    Falta: Math.max(0, a.threshold - a.stock),
    Estado: STATUS_LABEL[statusFromStock(a.stock, a.threshold)] ?? "",
    Ubicación: locationMap[a.locationId] ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: [
      "Código",
      "Nombre",
      "Marca",
      "Categoría",
      "Cantidad actual",
      "Cantidad mínima",
      "Falta",
      "Estado",
      "Ubicación",
    ],
  });
  ws["!cols"] = [
    { wch: 18 },
    { wch: 36 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 28 },
  ];
  freezeHeader(ws);
  autoFilter(ws, "I", rows.length);

  // Format de números
  for (let r = 2; r <= rows.length + 1; r++) {
    for (const col of ["E", "F", "G"]) {
      const cell = ws[`${col}${r}`];
      if (cell) cell.z = "#,##0";
    }
  }
  return ws;
}

function buildPlanSheet(plan: PurchaseOrder): XLSX.WorkSheet {
  const rows = plan.lines.map((l) => ({
    Item: l.name,
    Marca: l.brand,
    Categoría: l.category,
    Cantidad: l.qty,
    Nuevo: l.isNew ? "Sí" : "",
    SKU: l.assetId ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ["Item", "Marca", "Categoría", "Cantidad", "Nuevo", "SKU"],
  });
  ws["!cols"] = [
    { wch: 36 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 8 },
    { wch: 22 },
  ];
  freezeHeader(ws);
  autoFilter(ws, "F", rows.length);
  for (let r = 2; r <= rows.length + 1; r++) {
    const cell = ws[`D${r}`];
    if (cell) cell.z = "#,##0";
  }
  return ws;
}

function buildReadyOrdersSheet(orders: PurchaseOrder[]): XLSX.WorkSheet {
  const rows: Array<Record<string, string | number>> = [];
  for (const o of orders) {
    for (const l of o.lines) {
      rows.push({
        Orden: o.reference,
        Item: l.name,
        Marca: l.brand,
        Categoría: l.category,
        Cantidad: l.qty,
        Nuevo: l.isNew ? "Sí" : "",
        Nota: o.note ?? "",
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: [
      "Orden",
      "Item",
      "Marca",
      "Categoría",
      "Cantidad",
      "Nuevo",
      "Nota",
    ],
  });
  ws["!cols"] = [
    { wch: 14 },
    { wch: 36 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 8 },
    { wch: 32 },
  ];
  freezeHeader(ws);
  autoFilter(ws, "G", rows.length);
  for (let r = 2; r <= rows.length + 1; r++) {
    const cell = ws[`E${r}`];
    if (cell) cell.z = "#,##0";
  }
  return ws;
}

function buildPendingSheet(requests: InternalRequest[]): XLSX.WorkSheet {
  const rows = requests.map((r) => ({
    Referencia: r.reference,
    Solicitante: r.requesterName,
    Equipo: r.requesterTeam,
    Item: r.itemName,
    Marca: r.brand,
    Categoría: r.category,
    Cantidad: r.qty,
    Prioridad: PRIORITY_LABEL[r.priority] ?? r.priority,
    Estado: REQ_STATUS_LABEL[r.status] ?? r.status,
    Motivo: r.reason,
    "Fecha pedido": r.createdAt.toLocaleDateString("es-AR"),
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: [
      "Referencia",
      "Solicitante",
      "Equipo",
      "Item",
      "Marca",
      "Categoría",
      "Cantidad",
      "Prioridad",
      "Estado",
      "Motivo",
      "Fecha pedido",
    ],
  });
  ws["!cols"] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 20 },
    { wch: 30 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 32 },
    { wch: 14 },
  ];
  freezeHeader(ws);
  autoFilter(ws, "K", rows.length);
  for (let r = 2; r <= rows.length + 1; r++) {
    const cell = ws[`G${r}`];
    if (cell) cell.z = "#,##0";
  }
  return ws;
}

/** Genera el Excel completo del reporte mensual y devuelve base64 del binario. */
export function buildReportExcelBase64(opts: Opts): string {
  const wb = XLSX.utils.book_new();

  // Resumen siempre primero
  XLSX.utils.book_append_sheet(wb, buildSummary(opts), "Resumen");

  if (opts.sections.inventory && opts.items.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildInventorySheet(opts.items, opts.locations),
      "Stock bajo",
    );
  }
  if (opts.sections.plan && opts.plan && opts.plan.lines.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildPlanSheet(opts.plan),
      "Plan del mes",
    );
  }
  if (opts.sections.readyOrders && opts.readyOrders.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildReadyOrdersSheet(opts.readyOrders),
      "Órdenes listas",
    );
  }
  if (opts.sections.pendingRequests && opts.pendingRequests.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      buildPendingSheet(opts.pendingRequests),
      "Pedidos pendientes",
    );
  }

  // XLSX.write con type:"base64" da directamente la cadena base64 del binario.
  const base64 = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  return base64;
}

/** Slug del filename: invIT-reporte-2026-05.xlsx */
export function reportExcelFilename(monthLabel: string): string {
  const slug = monthLabel
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-");
  return `invIT-reporte-${slug}.xlsx`;
}
