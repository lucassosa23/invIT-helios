"use client";

import * as XLSX from "xlsx";

import {
  statusFromStock,
  type Asset,
  type Location,
} from "@/lib/fake-data";

const STATUS_LABEL: Record<string, string> = {
  healthy: "Disponible",
  low: "Bajo",
  critical: "Crítico",
  out: "Agotado",
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export function exportInventoryToExcel(
  assets: Asset[],
  locations: Location[],
) {
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));

  const rows = assets.map((a) => ({
    Código: a.sku,
    Nombre: a.name,
    Marca: a.brand,
    Categoría: a.category,
    "Cantidad actual": a.stock,
    "Cantidad mínima": a.threshold,
    Estado: STATUS_LABEL[a.status] ?? a.status,
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
      "Estado",
      "Ubicación",
    ],
  });
  ws["!cols"] = [
    { wch: 18 },
    { wch: 34 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 28 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, `inventario_${todayStr()}.xlsx`);
}

export function downloadTemplate(locations: Location[]) {
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
