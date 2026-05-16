"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

import { createScanSessionAction } from "../lib/actions";
import { KIND_LABEL, type ScanKind } from "../lib/scan";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function NewSessionDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        {open && <Body onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function Body({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(() => suggestName("in"));
  const [kind, setKind] = useState<ScanKind>("in");
  const [pending, startTransition] = useTransition();

  const handleKind = (k: ScanKind) => {
    setKind(k);
    // Si el usuario no tocó el nombre, lo sincronizamos.
    if (name === suggestName("in") || name === suggestName("out")) {
      setName(suggestName(k));
    }
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error("Falta el nombre de la sesión");
      return;
    }
    startTransition(async () => {
      try {
        const { id } = await createScanSessionAction({ name, kind });
        router.push(`/scan/${id}`);
      } catch (err) {
        toast.error("No se pudo crear la sesión", {
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
            <DialogTitle className="text-[15px] font-semibold tracking-tight">
              Nueva sesión de escaneo
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12.5px]">
              Elegí si vas a sumar al stock (recepción) o descontar (entrega,
              baja).
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
        <div className="grid gap-2">
          <Label className="text-[12px] font-medium">Tipo</Label>
          <div className="grid grid-cols-2 gap-2">
            <KindOption
              kind="in"
              selected={kind === "in"}
              onClick={() => handleKind("in")}
              icon={<ArrowDownToLine className="size-4" />}
              hint="Sumar al inventario"
            />
            <KindOption
              kind="out"
              selected={kind === "out"}
              onClick={() => handleKind("out")}
              icon={<ArrowUpFromLine className="size-4" />}
              hint="Restar del inventario"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="sess-name" className="text-[12px] font-medium">
            Nombre <span className="text-status-critical">*</span>
          </Label>
          <Input
            id="sess-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ej. Llegada proveedor X"
            className="h-9"
          />
          <p className="text-[11px] text-muted-foreground">
            Te ayuda a identificar la sesión después en el historial.
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
          {pending ? "Creando…" : "Empezar a escanear"}
        </Button>
      </footer>
    </>
  );
}

function KindOption({
  kind,
  selected,
  onClick,
  icon,
  hint,
}: {
  kind: ScanKind;
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-lg p-3 text-left transition-colors ring-1",
        selected
          ? kind === "in"
            ? "bg-status-healthy-soft ring-status-healthy/40 text-status-healthy"
            : "bg-status-low-soft ring-status-low/40 text-status-low"
          : "bg-muted/40 ring-foreground/10 text-foreground hover:bg-muted/60",
      )}
    >
      <span className="flex items-center gap-1.5 text-[13px] font-semibold">
        {icon}
        {KIND_LABEL[kind]}
      </span>
      <span
        className={cn(
          "text-[11.5px]",
          selected ? "" : "text-muted-foreground",
        )}
      >
        {hint}
      </span>
    </button>
  );
}

function suggestName(kind: ScanKind): string {
  const now = new Date();
  const fmt = now.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
  return kind === "in"
    ? `Recepción ${fmt}`
    : `Egreso ${fmt}`;
}
