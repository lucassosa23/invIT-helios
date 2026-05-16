"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Package, Search, X } from "lucide-react";
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
import { cn } from "@/lib/utils";

import {
  resolveUnknownLinkAction,
  searchAssetsForLinkAction,
} from "../lib/actions";
import type { UnknownScan } from "../lib/scan";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unknown: UnknownScan;
  onLinked?: () => void;
};

type Result = Awaited<ReturnType<typeof searchAssetsForLinkAction>>[number];

export function LinkUnknownDialog({
  open,
  onOpenChange,
  unknown,
  onLinked,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        {open && (
          <Body
            unknown={unknown}
            onClose={() => onOpenChange(false)}
            onLinked={onLinked}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Body({
  unknown,
  onClose,
  onLinked,
}: {
  unknown: UnknownScan;
  onClose: () => void;
  onLinked?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  const trimmed = query.trim();

  // Búsqueda con debounce 200ms. Solo dispara fetch cuando hay query;
  // si el usuario borra el input, los resultados se limpian sin setState
  // dentro del effect (lo derivamos abajo en el render).
  useEffect(() => {
    if (!trimmed) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await searchAssetsForLinkAction({ query: trimmed });
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [trimmed]);

  // Cuando el query queda vacío, los resultados acumulados ya no aplican.
  const displayedResults = trimmed ? results : [];

  const link = (assetId: string, name: string) => {
    startTransition(async () => {
      try {
        await resolveUnknownLinkAction(unknown.id, assetId);
        toast.success("Vinculado al inventario", {
          description: `${unknown.barcode} → ${name}`,
        });
        onLinked?.();
        onClose();
      } catch (err) {
        toast.error("No se pudo vincular", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  const placeholder = useMemo(
    () => `Buscar en el inventario para vincular ${unknown.barcode}…`,
    [unknown.barcode],
  );

  return (
    <>
      <DialogHeader className="gap-1 border-b border-border/70 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="truncate text-[15px] font-semibold tracking-tight">
              Vincular código a un item
            </DialogTitle>
            <DialogDescription className="mt-1 text-[12.5px]">
              Elegí qué item del inventario corresponde al código{" "}
              <span className="font-mono font-semibold text-foreground">
                {unknown.barcode}
              </span>
              . Si el item no tenía código asignado, le va a quedar éste para
              futuros escaneos.
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

      <div className="flex flex-col gap-3 overflow-hidden p-5 sm:p-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="h-10 pl-9"
            autoFocus
          />
        </div>

        {!trimmed ? (
          <div className="grid place-items-center rounded-lg bg-card px-4 py-10 text-center text-[12.5px] text-muted-foreground ring-1 ring-foreground/10">
            Empezá a tipear para buscar items en el inventario.
          </div>
        ) : loading ? (
          <div className="grid place-items-center rounded-lg bg-card px-4 py-8 text-center text-[12.5px] text-muted-foreground ring-1 ring-foreground/10">
            Buscando…
          </div>
        ) : displayedResults.length === 0 ? (
          <div className="grid place-items-center rounded-lg bg-card px-4 py-8 text-center text-[12.5px] text-muted-foreground ring-1 ring-foreground/10">
            Sin resultados para &ldquo;{trimmed}&rdquo;. Usá &ldquo;Crear
            nuevo&rdquo; si todavía no está cargado.
          </div>
        ) : (
          <ul className="max-h-[360px] divide-y divide-border/50 overflow-y-auto rounded-lg bg-background/40 ring-1 ring-foreground/10">
            {displayedResults.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => link(a.id, a.name)}
                  disabled={pending}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/30",
                    pending && "opacity-60",
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted/60 text-muted-foreground ring-1 ring-foreground/10">
                    <Package className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">
                      {a.name}
                    </div>
                    <div className="truncate text-[12px] text-muted-foreground">
                      {a.brand || "—"} · {a.category} · stock {a.stock}
                    </div>
                    {a.barcode && (
                      <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                        Código actual: {a.barcode}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-5 py-3 sm:px-6">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
      </footer>
    </>
  );
}
