"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Download,
  FileSpreadsheet,
  FileUp,
  Mail,
  PackageOpen,
  PackageX,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { statusFromStock } from "@/lib/fake-data";
import type { Asset, Location, Status } from "@/lib/fake-data";
import {
  clearInventory,
  loadInventory,
  saveInventory,
} from "@/lib/storage";

import {
  downloadTemplate,
  exportInventoryToExcel,
  parseExcelFile,
  rowsToAssets,
  type ParsedRow,
} from "../lib/excel";
import { ImportPreview } from "./import-preview";
import { InventoryItemCard } from "./inventory-item-card";
import { ItemFormDialog, type ItemFormValues } from "./item-form-dialog";

const STATUS_OPTIONS: Array<{
  value: "all" | Status;
  label: string;
  tone?: Status;
}> = [
  { value: "all", label: "Todos" },
  { value: "healthy", label: "Disponible", tone: "healthy" },
  { value: "low", label: "Bajo", tone: "low" },
  { value: "critical", label: "Crítico", tone: "critical" },
  { value: "out", label: "Agotado", tone: "out" },
];

type Props = {
  initialAssets: Asset[];
  locations: Location[];
};

let newIdSeed = 1;

export function InventoryList({ initialAssets, locations }: Props) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [category, setCategory] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [importRows, setImportRows] = useState<ParsedRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = loadInventory();
    if (stored && stored.length > 0) {
      setAssets(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveInventory(assets);
  }, [assets, hydrated]);

  const locationMap = useMemo(
    () => Object.fromEntries(locations.map((l) => [l.id, l])),
    [locations],
  );
  const categories = useMemo(
    () => Array.from(new Set(assets.map((a) => a.category))).sort(),
    [assets],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (category !== "all" && a.category !== category) return false;
      if (q) {
        const hay = `${a.name} ${a.brand} ${a.sku} ${a.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [assets, query, status, category]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = {
      healthy: 0,
      low: 0,
      critical: 0,
      out: 0,
    };
    for (const a of assets) c[a.status]++;
    return c;
  }, [assets]);

  const hasActiveFilters =
    query.trim() !== "" || status !== "all" || category !== "all";

  const openAdd = () => {
    setEditingId(null);
    setSheetOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setSheetOpen(true);
  };

  const handleSubmit = (values: ItemFormValues) => {
    if (editingId) {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? {
                ...a,
                ...values,
                status: statusFromStock(values.stock, values.threshold),
                updatedAt: new Date(),
              }
            : a,
        ),
      );
      toast.success("Item actualizado", {
        description: values.name,
      });
    } else {
      const id = `ast_new_${++newIdSeed}_${Date.now().toString(36)}`;
      const skuBase = `${values.category.slice(0, 3).toUpperCase() || "NEW"}-${
        values.brand.slice(0, 3).toUpperCase() || "GEN"
      }-${id.slice(-4).toUpperCase()}`;
      const asset: Asset = {
        id,
        sku: skuBase,
        name: values.name,
        brand: values.brand,
        category: values.category,
        stock: values.stock,
        threshold: values.threshold,
        unitCost: 0,
        locationId: values.locationId,
        vendorId: "",
        warrantyExpiresAt: new Date(0),
        status: statusFromStock(values.stock, values.threshold),
        updatedAt: new Date(),
      };
      setAssets((prev) => [asset, ...prev]);
      toast.success("Item agregado", {
        description: values.name,
      });
    }
    setSheetOpen(false);
    setEditingId(null);
  };

  const handleAdjust = (id: string, delta: number) => {
    setAssets((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const newStock = Math.max(0, a.stock + delta);
        if (newStock === a.stock) return a;
        return {
          ...a,
          stock: newStock,
          status: statusFromStock(newStock, a.threshold),
          updatedAt: new Date(),
        };
      }),
    );
  };

  const handleDelete = (id: string) => {
    const target = assets.find((a) => a.id === id);
    if (!target) return;
    setAssets((prev) => prev.filter((a) => a.id !== id));
    toast(`${target.name} eliminado`, {
      action: {
        label: "Deshacer",
        onClick: () => setAssets((prev) => [target, ...prev]),
      },
    });
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const rows = await parseExcelFile(file, locations);
      setImportRows(rows);
      setImportFileName(file.name);
      setImportOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("No pudimos leer el archivo", {
        description: "Probá con .xlsx, .xls o .csv válidos.",
      });
    }
  };

  const handleReplace = () => {
    const next = rowsToAssets(importRows);
    setAssets(next);
    setImportOpen(false);
    toast.success(`Inventario reemplazado`, {
      description: `${next.length} items importados`,
    });
  };

  const handleAppend = () => {
    const next = rowsToAssets(importRows);
    setAssets((prev) => [...next, ...prev]);
    setImportOpen(false);
    toast.success(`Items agregados`, {
      description: `${next.length} items sumados al inventario`,
    });
  };

  const handleExport = () => {
    if (assets.length === 0) {
      toast.error("No hay items para exportar");
      return;
    }
    exportInventoryToExcel(assets, locations);
    toast.success("Exportado a Excel");
  };

  const handleTemplate = () => {
    downloadTemplate(locations);
    toast.success("Plantilla descargada");
  };

  const handleClearAll = () => {
    if (assets.length === 0) return;
    const snapshot = assets;
    setAssets([]);
    clearInventory();
    toast(`Inventario vaciado`, {
      action: {
        label: "Deshacer",
        onClick: () => setAssets(snapshot),
      },
    });
  };

  const editingAsset = editingId
    ? assets.find((a) => a.id === editingId) ?? null
    : null;

  const isEmpty = hydrated && assets.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="overflow-hidden rounded-xl bg-card p-3 ring-1 ring-foreground/10">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, marca, código…"
                className="h-9 w-full pl-8 sm:max-w-md"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 rounded-md border border-input bg-input/30 px-2 text-[12.5px] outline-none transition-colors hover:bg-input/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:w-auto"
            >
              <option value="all">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 lg:ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTemplate}
              className="text-muted-foreground"
            >
              <FileSpreadsheet className="size-3.5" />
              Plantilla
            </Button>
            <Button variant="outline" size="sm" onClick={triggerFilePicker}>
              <FileUp className="size-3.5" />
              Importar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-3.5" />
              Exportar
            </Button>
            <Button size="sm" onClick={openAdd}>
              <Plus className="size-3.5" />
              Agregar
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {STATUS_OPTIONS.map((opt) => {
            const count =
              opt.value === "all" ? assets.length : counts[opt.value];
            const active = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={cn(
                  "group inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium transition-all duration-200",
                  active
                    ? "border-border bg-muted text-foreground shadow-sm"
                    : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/60 hover:text-foreground",
                )}
              >
                {opt.tone && (
                  <span
                    className={cn(
                      "size-1.5 rounded-full transition-transform group-hover:scale-125",
                      opt.tone === "healthy" && "bg-status-healthy",
                      opt.tone === "low" && "bg-status-low",
                      opt.tone === "critical" && "bg-status-critical",
                      opt.tone === "out" && "bg-status-out",
                    )}
                  />
                )}
                <span>{opt.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10.5px] tabular-nums transition-colors",
                    active
                      ? "bg-background text-foreground"
                      : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isEmpty && !hasActiveFilters ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-dashed border-border bg-gradient-to-br from-card to-card/40 px-8 py-16"
        >
          <div className="pointer-events-none absolute inset-0 -z-0 opacity-50">
            <div className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
          </div>
          <div className="relative flex flex-col items-center text-center">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{
                duration: 3.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="grid size-16 place-items-center rounded-2xl bg-primary/10 ring-1 ring-primary/30"
            >
              <PackageOpen className="size-7 text-primary" />
            </motion.div>
            <h3 className="mt-5 text-[17px] font-semibold tracking-tight">
              Tu inventario está vacío
            </h3>
            <p className="mt-1.5 max-w-md text-[13px] text-muted-foreground">
              Importá tu Excel actual o empezá a agregar items manualmente. Todo
              queda guardado en este navegador.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" onClick={triggerFilePicker}>
                <FileUp className="size-3.5" />
                Importar Excel
              </Button>
              <Button variant="outline" size="sm" onClick={openAdd}>
                <Plus className="size-3.5" />
                Agregar item
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTemplate}
                className="text-muted-foreground"
              >
                <FileSpreadsheet className="size-3.5" />
                Descargar plantilla
              </Button>
            </div>
            <p className="mt-5 inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground/80">
              <Sparkles className="size-3" />
              Soporta nombres de columna en español o inglés
            </p>
          </div>
        </motion.div>
      ) : (
        <>
          <motion.ul layout className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {filtered.map((a) => (
                <InventoryItemCard
                  key={a.id}
                  asset={a}
                  location={locationMap[a.locationId]}
                  onAdjust={(delta) => handleAdjust(a.id, delta)}
                  onEdit={() => openEdit(a.id)}
                  onDelete={() => handleDelete(a.id)}
                />
              ))}
            </AnimatePresence>
            {filtered.length === 0 && assets.length > 0 && (
              <motion.li
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid place-items-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center"
              >
                <PackageX className="size-6 text-muted-foreground/60" />
                <p className="mt-3 text-[14px] font-medium">
                  No encontramos nada
                </p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Probá con otro filtro o borrá la búsqueda.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setQuery("");
                    setStatus("all");
                    setCategory("all");
                  }}
                >
                  Limpiar filtros
                </Button>
              </motion.li>
            )}
          </motion.ul>

          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted-foreground">
            <span>
              Mostrando{" "}
              <span className="font-medium text-foreground tabular-nums">
                {filtered.length}
              </span>{" "}
              de {assets.length} items
            </span>
            <div className="flex items-center gap-3">
              <Link
                href="/inventory/email-preview"
                className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80"
              >
                <Mail className="size-3.5" />
                Vista previa email
              </Link>
              {assets.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-muted-foreground/70 transition-colors hover:text-status-critical"
                >
                  Vaciar todo
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <ImportPreview
        open={importOpen}
        onOpenChange={setImportOpen}
        rows={importRows}
        fileName={importFileName}
        onReplace={handleReplace}
        onAppend={handleAppend}
      />

      <ItemFormDialog
        open={sheetOpen}
        onOpenChange={(v) => {
          setSheetOpen(v);
          if (!v) setEditingId(null);
        }}
        editing={editingAsset}
        locations={locations}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
