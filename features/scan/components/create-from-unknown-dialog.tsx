"use client";

import { useState, useTransition } from "react";
import { PackagePlus, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";

import { resolveUnknownCreateAction } from "../lib/actions";
import type { UnknownScan } from "../lib/scan";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unknown: UnknownScan;
  onCreated?: () => void;
};

export function CreateFromUnknownDialog({
  open,
  onOpenChange,
  unknown,
  onCreated,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        {open && (
          <Body
            unknown={unknown}
            onClose={() => onOpenChange(false)}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Body({
  unknown,
  onClose,
  onCreated,
}: {
  unknown: UnknownScan;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [threshold, setThreshold] = useState(5);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!name.trim()) {
      toast.error("Falta el nombre del item");
      return;
    }
    if (!category.trim()) {
      toast.error("Falta la categoría");
      return;
    }
    startTransition(async () => {
      try {
        await resolveUnknownCreateAction(unknown.id, {
          name,
          brand,
          category,
          threshold,
        });
        toast.success("Item creado y vinculado", {
          description: `${name.trim()} · código ${unknown.barcode}`,
        });
        onCreated?.();
        onClose();
      } catch (err) {
        toast.error("No se pudo crear el item", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  return (
    <>
      <DialogHeader className="gap-1 border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <PackagePlus className="size-4 text-primary" />
              Crear item nuevo
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12.5px]">
              Se va a crear con el código{" "}
              <span className="font-mono font-semibold text-foreground">
                {unknown.barcode}
              </span>
              . Las{" "}
              <span className="font-semibold text-foreground">
                {unknown.count}
              </span>{" "}
              unidad{unknown.count === 1 ? "" : "es"} escaneada
              {unknown.count === 1 ? "" : "s"} quedan en la sesión.
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

      <div className="flex flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        <div className="grid gap-1.5">
          <Label htmlFor="adhoc-name" className="text-[12px] font-medium">
            Nombre <span className="text-status-critical">*</span>
          </Label>
          <Input
            id="adhoc-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Mouse Logitech M170"
            className="h-9"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="adhoc-brand" className="text-[12px] font-medium">
              Marca
            </Label>
            <Input
              id="adhoc-brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="ej. Logitech"
              className="h-9"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="adhoc-cat" className="text-[12px] font-medium">
              Categoría <span className="text-status-critical">*</span>
            </Label>
            <Input
              id="adhoc-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="ej. Periférico"
              className="h-9"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="adhoc-threshold" className="text-[12px] font-medium">
            Cantidad mínima
          </Label>
          <NumberInput
            id="adhoc-threshold"
            min={1}
            fallback={1}
            value={threshold}
            onChange={setThreshold}
            className="h-9 font-mono tabular-nums"
          />
          <p className="text-[11px] text-muted-foreground">
            A partir de qué stock se considera bajo. Lo podés ajustar después.
          </p>
        </div>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-5 py-3 sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={submit} disabled={pending}>
          {pending ? "Creando…" : "Crear y vincular"}
        </Button>
      </footer>
    </>
  );
}
