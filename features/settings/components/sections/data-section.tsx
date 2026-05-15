"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  HardDriveDownload,
  HardDriveUpload,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logAudit } from "@/features/settings/lib/audit-log";
import { loadOrders } from "@/features/procurement/lib/orders-storage";
import { loadRequests } from "@/features/requests/lib/requests";
import { loadInventory } from "@/lib/storage";
import { loadMembers } from "@/features/settings/lib/members";
import { loadCategories } from "@/features/settings/lib/categories";
import { loadWorkspace } from "@/features/settings/lib/workspace";
import { SectionCard, SectionFooter, SectionHeader } from "../section-primitives";

const PARTS = [
  { key: "inventory", label: "Inventario", load: () => loadInventory() ?? [] },
  { key: "orders", label: "Órdenes de compra", load: () => loadOrders() },
  { key: "requests", label: "Pedidos internos", load: () => loadRequests() },
  { key: "members", label: "Miembros", load: () => loadMembers() },
  { key: "categories", label: "Categorías", load: () => loadCategories() },
  { key: "workspace", label: "Workspace", load: () => loadWorkspace() },
] as const;

export function DataSection() {
  const [busy, setBusy] = useState(false);

  const exportAll = () => {
    setBusy(true);
    const snapshot: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      workspace: loadWorkspace(),
      data: {} as Record<string, unknown>,
    };
    for (const p of PARTS) {
      (snapshot.data as Record<string, unknown>)[p.key] = p.load();
    }
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invit-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logAudit("data.exported", "Snapshot completo del workspace", "JSON");
    toast.success("Snapshot exportado");
    setBusy(false);
  };

  const exportInventoryCsv = () => {
    const inv = loadInventory() ?? [];
    if (inv.length === 0) {
      toast.error("No hay inventario para exportar.");
      return;
    }
    const headers = [
      "id",
      "sku",
      "name",
      "category",
      "brand",
      "stock",
      "threshold",
      "unit_cost",
      "location_id",
      "vendor_id",
      "status",
    ];
    const rows = inv.map((a) =>
      [
        a.id,
        a.sku,
        a.name,
        a.category,
        a.brand,
        a.stock,
        a.threshold,
        a.unitCost,
        a.locationId,
        a.vendorId,
        a.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invit-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logAudit("data.exported", "Inventario", "CSV");
    toast.success("Inventario exportado a CSV");
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionCard>
        <SectionHeader
          icon={Download}
          title="Exportar datos"
          description="Descargá una copia portable del workspace en cualquier momento."
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-status-healthy-soft px-2 py-1 text-[11.5px] font-medium text-status-healthy">
              <CheckCircle2 className="size-3" /> habilitado
            </span>
          }
        />
        <div className="grid gap-3 px-5 py-5 sm:grid-cols-2">
          <ExportCard
            icon={FileJson}
            title="Snapshot completo"
            description="JSON con todos los recursos del workspace · inventario, compras, pedidos, sedes, proveedores."
            cta="Exportar JSON"
            onClick={exportAll}
            busy={busy}
          />
          <ExportCard
            icon={FileSpreadsheet}
            title="Inventario · CSV"
            description="Stock actual, umbrales y costos. Compatible con Excel y Google Sheets."
            cta="Exportar CSV"
            onClick={exportInventoryCsv}
            busy={busy}
          />
        </div>
        <SectionFooter>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> Los exports quedan registrados en el audit log.
          </span>
        </SectionFooter>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Upload}
          title="Importar"
          description="Subí datos masivos en CSV o JSON. La importación pasa por un preview antes de aplicar."
        />
        <div className="grid gap-3 px-5 py-5 sm:grid-cols-2">
          <UploadCard
            icon={HardDriveUpload}
            title="Importar inventario"
            description="CSV con columnas estándar. Disponible desde la pantalla de inventario."
            cta="Ir a importación"
            href="/inventory?import=1"
          />
          <UploadCard
            icon={HardDriveDownload}
            title="Restaurar snapshot"
            description="Re-aplica un snapshot exportado previamente. Sobrescribe los datos actuales."
            cta="Subir snapshot"
            disabled
          />
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Database}
          title="Volumen actual"
          description="Tamaño de cada dataset en este workspace."
        />
        <ul className="divide-y divide-border/60">
          {PARTS.map((p) => {
            const data = p.load();
            const count = Array.isArray(data) ? data.length : 1;
            return (
              <li
                key={p.key}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex items-center gap-2 text-[13px]">
                  <Database className="size-3.5 text-muted-foreground" />
                  <span>{p.label}</span>
                </div>
                <span className="font-mono text-[12.5px] text-muted-foreground">
                  {count.toLocaleString("es-AR")} {count === 1 ? "registro" : "registros"}
                </span>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}

function ExportCard({
  icon: Icon,
  title,
  description,
  cta,
  onClick,
  busy,
}: {
  icon: typeof Database;
  title: string;
  description: string;
  cta: string;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
          <Icon className="size-4" />
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-medium">{title}</div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onClick} disabled={busy} className="w-fit">
        <Download className="size-3.5" /> {cta}
      </Button>
    </div>
  );
}

function UploadCard({
  icon: Icon,
  title,
  description,
  cta,
  href,
  disabled,
}: {
  icon: typeof Database;
  title: string;
  description: string;
  cta: string;
  href?: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4",
        disabled && "opacity-60",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground ring-1 ring-foreground/10">
          <Icon className="size-4" />
        </div>
        <div className="flex-1">
          <div className="text-[13.5px] font-medium">{title}</div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
        </div>
      </div>
      {href ? (
        <a
          href={href}
          className={cn(
            "inline-flex w-fit items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-[12.5px] transition-colors hover:bg-muted",
            disabled && "pointer-events-none",
          )}
        >
          {cta}
        </a>
      ) : (
        <Button variant="outline" size="sm" disabled className="w-fit">
          {cta}
        </Button>
      )}
    </div>
  );
}
