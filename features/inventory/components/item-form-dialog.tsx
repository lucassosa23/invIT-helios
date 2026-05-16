"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Asset, Location } from "@/lib/fake-data";

export type ItemFormValues = {
  name: string;
  brand: string;
  category: string;
  stock: number;
  threshold: number;
  locationId: string;
  dismissedFromAutoPlan?: boolean;
  barcode?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: Asset | null;
  locations: Location[];
  onSubmit: (values: ItemFormValues) => void;
};

const empty: ItemFormValues = {
  name: "",
  brand: "",
  category: "",
  stock: 1,
  threshold: 5,
  locationId: "",
  barcode: "",
};

export function ItemFormDialog({
  open,
  onOpenChange,
  editing,
  locations,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {open && (
          <ItemFormBody
            editing={editing ?? null}
            locations={locations}
            onClose={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ItemFormBody({
  editing,
  locations,
  onClose,
  onSubmit,
}: {
  editing: Asset | null;
  locations: Location[];
  onClose: () => void;
  onSubmit: (values: ItemFormValues) => void;
}) {
  const [values, setValues] = useState<ItemFormValues>(() =>
    editing
      ? {
          name: editing.name,
          brand: editing.brand,
          category: editing.category,
          stock: editing.stock,
          threshold: editing.threshold,
          locationId: editing.locationId,
          barcode: editing.barcode ?? "",
        }
      : { ...empty, locationId: locations[0]?.id ?? "" },
  );
  const [includeInAutoPlan, setIncludeInAutoPlan] = useState(() =>
    editing ? !editing.dismissedFromAutoPlan : true,
  );

  const update = <K extends keyof ItemFormValues>(
    k: K,
    v: ItemFormValues[K],
  ) => setValues((s) => ({ ...s, [k]: v }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.name.trim()) return;
    onSubmit({
      ...values,
      name: values.name.trim(),
      brand: values.brand.trim(),
      category: values.category.trim() || "Otros",
      stock: Math.max(0, Math.floor(values.stock)),
      threshold: Math.max(1, Math.floor(values.threshold)),
      barcode: values.barcode?.trim() || "",
      dismissedFromAutoPlan: editing ? !includeInAutoPlan : undefined,
    });
  };

  return (
    <>
      <DialogHeader className="gap-1 border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="truncate text-[15px] font-semibold tracking-tight">
              {editing ? "Editar item" : "Nuevo item"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12.5px]">
              {editing
                ? "Modificá los datos y guardá los cambios."
                : "Sumá un item al inventario. Solo necesitás nombre y cantidad."}
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>
      </DialogHeader>

      <form
        id="item-form"
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="name" className="text-[12px] font-medium">
            Nombre <span className="text-status-critical">*</span>
          </Label>
          <Input
            id="name"
            autoFocus
            required
            placeholder="ej. ThinkPad T14 Gen 4"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            className="h-9"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="brand" className="text-[12px] font-medium">
              Marca
            </Label>
            <Input
              id="brand"
              placeholder="ej. Lenovo"
              value={values.brand}
              onChange={(e) => update("brand", e.target.value)}
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="category" className="text-[12px] font-medium">
              Categoría
            </Label>
            <Input
              id="category"
              placeholder="ej. Notebook"
              value={values.category}
              onChange={(e) => update("category", e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="stock" className="text-[12px] font-medium">
              Cantidad actual <span className="text-status-critical">*</span>
            </Label>
            <NumberInput
              id="stock"
              min={0}
              fallback={0}
              value={values.stock}
              onChange={(n) => update("stock", n)}
              className="h-9 font-mono tabular-nums"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="threshold" className="text-[12px] font-medium">
              Cantidad mínima <span className="text-status-critical">*</span>
            </Label>
            <NumberInput
              id="threshold"
              min={1}
              fallback={1}
              value={values.threshold}
              onChange={(n) => update("threshold", n)}
              className="h-9 font-mono tabular-nums"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="location" className="text-[12px] font-medium">
            Ubicación
          </Label>
          <select
            id="location"
            value={values.locationId}
            onChange={(e) => update("locationId", e.target.value)}
            className="h-9 rounded-md border border-input bg-input/30 px-2 text-[13px] outline-none transition-colors hover:bg-input/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="barcode" className="text-[12px] font-medium">
            Código de barras{" "}
            <span className="font-normal text-muted-foreground/70">
              (opcional)
            </span>
          </Label>
          <Input
            id="barcode"
            value={values.barcode ?? ""}
            onChange={(e) => update("barcode", e.target.value)}
            placeholder="Escaneá el código o ingresalo manualmente"
            className="h-9 font-mono"
            inputMode="text"
            autoComplete="off"
          />
          <p className="text-[11.5px] text-muted-foreground">
            Permite reconocerlo desde la sección de escaneo. Lo podés dejar
            vacío y vincularlo después al escanear por primera vez.
          </p>
        </div>

        {editing && (
          <label
            htmlFor="auto-plan-toggle"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg p-3 ring-1 transition-colors",
              includeInAutoPlan
                ? "bg-primary/5 ring-primary/30"
                : "bg-muted/40 ring-foreground/10 hover:bg-muted/60",
            )}
          >
            <input
              id="auto-plan-toggle"
              type="checkbox"
              checked={includeInAutoPlan}
              onChange={(e) => setIncludeInAutoPlan(e.target.checked)}
              className="mt-0.5 size-4 accent-primary"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[13px] font-medium">
                <Sparkles
                  className={cn(
                    "size-3.5",
                    includeInAutoPlan
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                />
                Incluir en el plan de compras automático
              </div>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                {includeInAutoPlan
                  ? "Cuando este item baje del mínimo, se va a agregar solo al plan del mes."
                  : "Item excluido del auto-plan. Aparece en Sugerencias para agregarlo manualmente si querés."}
              </p>
            </div>
          </label>
        )}

        <p className="mt-1 rounded-md bg-muted/60 px-3 py-2 text-[11.5px] text-muted-foreground">
          El estado (Disponible / Bajo / Crítico / Agotado) se calcula
          automáticamente a partir de la cantidad actual y la cantidad
          mínima.
        </p>
      </form>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-5 py-3 sm:px-6">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" form="item-form" size="sm">
          {editing ? "Guardar cambios" : "Agregar"}
          <ArrowRight className="size-3.5" />
        </Button>
      </footer>
    </>
  );
}
