"use client";

import { AlertCircle, ArrowRight, FileSpreadsheet } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusFromStock } from "@/lib/fake-data";
import type { ParsedRow } from "../lib/excel";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  rows: ParsedRow[];
  fileName: string;
  onReplace: () => void;
  onAppend: () => void;
};

export function ImportPreview({
  open,
  onOpenChange,
  rows,
  fileName,
  onReplace,
  onAppend,
}: Props) {
  const preview = rows.slice(0, 8);
  const empty = rows.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 p-0">
        <DialogHeader className="border-b border-border/70 px-5 py-4">
          <DialogTitle className="text-[15px]">
            Vista previa de importación
          </DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Archivo: <span className="font-mono">{fileName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 p-5">
          {empty ? (
            <div className="flex items-start gap-3 rounded-lg border border-status-critical/30 bg-status-critical-soft p-3 text-[13px] text-status-critical">
              <AlertCircle className="size-4 shrink-0" />
              <div>
                No pudimos leer ningún item del archivo. Revisá que tenga
                columnas tipo <code>Nombre</code> y <code>Cantidad</code>, o
                descargá la plantilla.
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-[13px]">
                <FileSpreadsheet className="size-4 text-primary" />
                <span>
                  Detectamos{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {rows.length}
                  </span>{" "}
                  items para importar
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-border/70">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/40 text-[10.5px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Nombre</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Categoría
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Cant.
                      </th>
                      <th className="px-3 py-2 text-right font-medium">Mín.</th>
                      <th className="px-3 py-2 text-left font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => {
                      const st = statusFromStock(r.stock, r.threshold);
                      return (
                        <tr
                          key={i}
                          className="border-b border-border/40 last:border-b-0"
                        >
                          <td className="px-3 py-2">
                            <div className="font-medium">{r.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {r.brand || "—"}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {r.category}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {r.stock}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                            {r.threshold}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                                st === "healthy" &&
                                  "bg-status-healthy-soft text-status-healthy",
                                st === "low" &&
                                  "bg-status-low-soft text-status-low",
                                st === "critical" &&
                                  "bg-status-critical-soft text-status-critical",
                                st === "out" &&
                                  "bg-status-out-soft text-status-out",
                              )}
                            >
                              {st === "healthy"
                                ? "Disponible"
                                : st === "low"
                                  ? "Bajo"
                                  : st === "critical"
                                    ? "Crítico"
                                    : "Agotado"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {rows.length > preview.length && (
                <p className="text-[11.5px] text-muted-foreground">
                  Mostrando {preview.length} de {rows.length} filas. El resto se
                  importa igual.
                </p>
              )}

              <p className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-[11.5px] text-muted-foreground">
                Si una ubicación o proveedor de tu Excel no coincide con los
                existentes, asignamos los primeros por default. Después podés
                editarlos uno por uno.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-row items-center justify-end gap-2 border-t border-border/70 px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          {!empty && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAppend}
              >
                Agregar al inventario
              </Button>
              <Button type="button" size="sm" onClick={onReplace}>
                Reemplazar todo
                <ArrowRight className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
