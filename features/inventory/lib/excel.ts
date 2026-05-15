"use client";

import {
  statusFromStock,
  type Asset,
  type Location,
} from "@/lib/fake-data";

// xlsx pesa ~600KB. Lazy-load para no inflar el bundle de /inventory; el
// chunk solo se descarga la primera vez que se importa/exporta/parsea.
const loadXLSX = () => import("xlsx");

const STATUS_LABEL: Record<string, string> = {
  healthy: "Disponible",
  low: "Bajo",
  critical: "Crítico",
  out: "Agotado",
};

// Crítico primero (más visible al abrir el archivo), después bajo, healthy, out.
const STATUS_ORDER: Record<string, number> = {
  critical: 0,
  low: 1,
  healthy: 2,
  out: 3,
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const HEADERS = [
  "Código",
  "Nombre",
  "Marca",
  "Categoría",
  "Cantidad actual",
  "Cantidad mínima",
  "Falta",
  "Estado",
  "Ubicación",
] as const;

export async function exportInventoryToExcel(
  assets: Asset[],
  locations: Location[],
) {
  const XLSX = await loadXLSX();
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));

  const sorted = [...assets].sort((a, b) => {
    const so = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (so !== 0) return so;
    const cat = a.category.localeCompare(b.category, "es");
    if (cat !== 0) return cat;
    return a.name.localeCompare(b.name, "es");
  });

  const rows = sorted.map((a) => ({
    Código: a.sku,
    Nombre: a.name,
    Marca: a.brand,
    Categoría: a.category,
    "Cantidad actual": a.stock,
    "Cantidad mínima": a.threshold,
    Falta: Math.max(0, a.threshold - a.stock),
    Estado: STATUS_LABEL[a.status] ?? a.status,
    Ubicación: locationMap[a.locationId] ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows, {
    header: [...HEADERS],
  });

  // Anchos optimizados
  ws["!cols"] = [
    { wch: 18 }, // Código
    { wch: 36 }, // Nombre
    { wch: 16 }, // Marca
    { wch: 18 }, // Categoría
    { wch: 14 }, // Cantidad actual
    { wch: 14 }, // Cantidad mínima
    { wch: 10 }, // Falta
    { wch: 14 }, // Estado
    { wch: 28 }, // Ubicación
  ];

  // Freeze fila de encabezado
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  // Auto-filtro en todas las columnas (rango = header + data)
  const lastCol = String.fromCharCode("A".charCodeAt(0) + HEADERS.length - 1);
  ws["!autofilter"] = { ref: `A1:${lastCol}${rows.length + 1}` };

  // Estilos: el writer comunitario de SheetJS no escribe `.s` (estilos), pero
  // sí respeta `.z` (number format) y `.t` (tipo). Le damos formato a los
  // contadores para que se muestren como enteros con separador.
  const numCols = ["E", "F", "G"]; // Cantidad actual, Cantidad mínima, Falta
  for (let r = 2; r <= rows.length + 1; r++) {
    for (const col of numCols) {
      const cell = ws[`${col}${r}`];
      if (cell) cell.z = "#,##0";
    }
  }

  // Hoja Resumen
  const total = sorted.length;
  const byStatus: Record<string, number> = {
    healthy: 0,
    low: 0,
    critical: 0,
    out: 0,
  };
  const byCategory: Record<string, number> = {};
  let totalUnits = 0;
  let totalMissing = 0;
  for (const a of sorted) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    byCategory[a.category] = (byCategory[a.category] ?? 0) + 1;
    totalUnits += a.stock;
    totalMissing += Math.max(0, a.threshold - a.stock);
  }

  const summaryRows: (string | number)[][] = [
    ["RESUMEN DE INVENTARIO"],
    [`Generado: ${new Date().toLocaleString("es-AR")}`],
    [],
    ["Total de items", total],
    ["Unidades totales en stock", totalUnits],
    ["Unidades faltantes (bajo umbral)", totalMissing],
    [],
    ["Por estado", ""],
    [`  ${STATUS_LABEL.critical}`, byStatus.critical ?? 0],
    [`  ${STATUS_LABEL.low}`, byStatus.low ?? 0],
    [`  ${STATUS_LABEL.healthy}`, byStatus.healthy ?? 0],
    [`  ${STATUS_LABEL.out}`, byStatus.out ?? 0],
    [],
    ["Por categoría", ""],
    ...Object.entries(byCategory)
      .sort((a, b) => a[0].localeCompare(b[0], "es"))
      .map(([cat, n]) => [`  ${cat}`, n] as [string, number]),
  ];
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs["!cols"] = [{ wch: 38 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summaryWs, "Resumen");
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");

  // Pestaña activa por defecto: Inventario
  wb.Workbook = { ...(wb.Workbook ?? {}), Views: [{ RTL: false }] };

  XLSX.writeFile(wb, `inventario_${todayStr()}.xlsx`);
}

export async function downloadTemplate(locations: Location[]) {
  const XLSX = await loadXLSX();
  const sample = [
    {
      Código: "NOT-LEN-0001",
      Nombre: "ThinkPad T14 Gen 4",
      Marca: "Lenovo",
      Categoría: "Notebook",
      "Cantidad actual": 12,
      "Cantidad mínima": 5,
      Ubicación: locations[0]?.name ?? "Sede Central",
    },
    {
      Código: "MON-DEL-0002",
      Nombre: "Monitor U2723QE 27 4K",
      Marca: "Dell",
      Categoría: "Monitor",
      "Cantidad actual": 3,
      "Cantidad mínima": 6,
      Ubicación: locations[1]?.name ?? "Sucursal",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample);
  ws["!cols"] = [
    { wch: 18 },
    { wch: 32 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 28 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
  XLSX.writeFile(wb, "plantilla_inventario.xlsx");
}

export type ParsedRow = {
  name: string;
  brand: string;
  category: string;
  stock: number;
  threshold: number;
  locationId: string;
  sku?: string;
  rawLocation: string;
};

const pickStr = (
  row: Record<string, unknown>,
  ...keys: string[]
): string => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v).trim();
    }
  }
  return "";
};

const pickNum = (
  row: Record<string, unknown>,
  fallback: number,
  ...keys: string[]
): number => {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      const n = Number(String(v).replace(/,/g, "."));
      if (!Number.isNaN(n)) return n;
    }
  }
  return fallback;
};

export async function parseExcelFile(
  file: File,
  locations: Location[],
): Promise<ParsedRow[]> {
  const XLSX = await loadXLSX();
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const defaultLocation = locations[0]?.id ?? "";

  return rows.flatMap<ParsedRow>((row) => {
    const norm: Record<string, unknown> = {};
    for (const k of Object.keys(row)) {
      const key = k.trim();
      norm[key] = row[k];
      norm[key.toLowerCase()] = row[k];
    }

    const name = pickStr(
      norm,
      "Nombre",
      "nombre",
      "Name",
      "name",
      "Item",
      "item",
      "Producto",
      "producto",
      "Descripción",
      "descripción",
      "descripcion",
    );
    if (!name) return [];

    const brand = pickStr(
      norm,
      "Marca",
      "marca",
      "Brand",
      "brand",
      "Fabricante",
      "fabricante",
    );
    const category =
      pickStr(
        norm,
        "Categoría",
        "categoría",
        "categoria",
        "Category",
        "category",
        "Tipo",
        "tipo",
        "Rubro",
        "rubro",
      ) || "Otros";
    const stock = pickNum(
      norm,
      0,
      "Cantidad actual",
      "cantidad actual",
      "Cantidad",
      "cantidad",
      "Stock",
      "stock",
      "Existencias",
      "existencias",
      "Qty",
      "qty",
    );
    const threshold = pickNum(
      norm,
      5,
      "Cantidad mínima",
      "cantidad mínima",
      "cantidad minima",
      "Mínimo",
      "mínimo",
      "minimo",
      "Mín",
      "Min",
      "Threshold",
    );
    const rawLocation = pickStr(
      norm,
      "Ubicación",
      "ubicación",
      "ubicacion",
      "Location",
      "location",
      "Sede",
      "sede",
      "Sucursal",
      "sucursal",
    );
    const sku = pickStr(
      norm,
      "Código",
      "código",
      "codigo",
      "SKU",
      "sku",
      "Code",
      "code",
    );

    const locationId =
      locations.find(
        (l) => l.name.toLowerCase() === rawLocation.toLowerCase(),
      )?.id ?? defaultLocation;

    return [
      {
        name,
        brand,
        category,
        stock: Math.max(0, Math.floor(stock)),
        threshold: Math.max(1, Math.floor(threshold)),
        locationId,
        sku: sku || undefined,
        rawLocation,
      },
    ];
  });
}

export function rowsToAssets(rows: ParsedRow[]): Asset[] {
  const now = Date.now();
  return rows.map((r, i) => {
    const id = `imp_${now.toString(36)}_${i}`;
    const sku =
      r.sku ||
      `${(r.category.slice(0, 3) || "GEN").toUpperCase()}-${(
        r.brand.slice(0, 3) || "BRD"
      ).toUpperCase()}-${(i + 1).toString().padStart(4, "0")}`;
    return {
      id,
      sku,
      name: r.name,
      brand: r.brand,
      category: r.category,
      stock: r.stock,
      threshold: r.threshold,
      unitCost: 0,
      locationId: r.locationId,
      vendorId: "",
      warrantyExpiresAt: new Date(0),
      status: statusFromStock(r.stock, r.threshold),
      updatedAt: new Date(now),
    };
  });
}
