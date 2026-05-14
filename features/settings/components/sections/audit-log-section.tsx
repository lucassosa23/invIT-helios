"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Download,
  FileClock,
  Filter,
  Info,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import {
  ACTION_KIND,
  ACTION_LABEL,
  clearAuditLog,
  loadAuditLog,
  logAudit,
  subscribeAuditLog,
  type AuditEntry,
} from "@/features/settings/lib/audit-log";
import { SectionCard, SectionFooter, SectionHeader } from "../section-primitives";

const KIND_ICON = {
  info: Info,
  warning: AlertTriangle,
  danger: AlertOctagon,
};

const KIND_TONE = {
  info: "bg-status-info-soft text-status-info ring-status-info/30",
  warning: "bg-status-low-soft text-status-low ring-status-low/30",
  danger: "bg-status-critical-soft text-status-critical ring-status-critical/30",
};

export function AuditLogSection() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "info" | "warning" | "danger">("all");

  useEffect(() => {
    const sync = () => setEntries(loadAuditLog());
    sync();
    return subscribeAuditLog(sync);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => (filter === "all" ? true : ACTION_KIND[e.action] === filter))
      .filter((e) => {
        if (!q) return true;
        return (
          ACTION_LABEL[e.action].toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          (e.meta ?? "").toLowerCase().includes(q) ||
          e.actor.toLowerCase().includes(q)
        );
      });
  }, [entries, query, filter]);

  const exportCsv = () => {
    const headers = ["fecha", "actor", "accion", "resumen", "meta"];
    const lines = [headers.join(",")];
    for (const e of entries) {
      const row = [
        e.at.toISOString(),
        e.actor,
        ACTION_LABEL[e.action],
        e.summary.replace(/[",\n]/g, " "),
        (e.meta ?? "").replace(/[",\n]/g, " "),
      ]
        .map((v) => `"${v}"`)
        .join(",");
      lines.push(row);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invit-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Audit log exportado");
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionCard>
        <SectionHeader
          icon={FileClock}
          title="Audit log"
          description={`${entries.length} eventos registrados. Las últimas 500 entradas se conservan localmente.`}
          action={
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="size-3.5" /> CSV
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (!confirm("¿Limpiar todo el audit log? Esta acción también queda registrada.")) return;
                  clearAuditLog();
                  logAudit("audit.cleared", "Operación manual");
                  toast.success("Audit log purgado");
                }}
                disabled={entries.length === 0}
              >
                <Trash2 className="size-3.5" /> Limpiar
              </Button>
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por acción, actor o detalle…"
              className="h-9 pl-8"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="size-3.5 text-muted-foreground" />
            <Select
              value={filter}
              onValueChange={(v) =>
                v && setFilter(v as "all" | "info" | "warning" | "danger")
              }
            >
              <SelectTrigger className="h-9 w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="info">Informativos</SelectItem>
                <SelectItem value="warning">Advertencias</SelectItem>
                <SelectItem value="danger">Destructivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center text-[13px] text-muted-foreground">
            {entries.length === 0
              ? "Aún no hay actividad registrada. Probá cambiar un ajuste."
              : "Sin coincidencias."}
          </div>
        ) : (
          <ol className="relative divide-y divide-border/60">
            {filtered.map((e) => {
              const kind = ACTION_KIND[e.action];
              const Icon = KIND_ICON[kind];
              return (
                <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                  <div
                    className={cn(
                      "mt-0.5 grid size-7 place-items-center rounded-full ring-1",
                      KIND_TONE[kind],
                    )}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-[13px] font-medium">{ACTION_LABEL[e.action]}</span>
                      <span className="text-[11.5px] text-muted-foreground">
                        {formatRelative(e.at)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-muted-foreground">
                      <span className="font-medium text-foreground">{e.actor}</span>
                      <span className="mx-1.5 text-muted-foreground/50">·</span>
                      <span>{e.summary}</span>
                      {e.meta && (
                        <>
                          <span className="mx-1.5 text-muted-foreground/50">·</span>
                          <span>{e.meta}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <code className="hidden text-[10.5px] text-muted-foreground/60 sm:inline">
                    {e.id}
                  </code>
                </li>
              );
            })}
          </ol>
        )}
        <SectionFooter>
          <span>
            Eventos almacenados localmente. La retención se configura en{" "}
            <span className="font-medium text-foreground">Seguridad</span>.
          </span>
        </SectionFooter>
      </SectionCard>
    </div>
  );
}
