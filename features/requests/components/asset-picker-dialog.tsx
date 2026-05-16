"use client";

import { useMemo, useState } from "react";
import { Package, Search, X } from "lucide-react";

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
import { stockTone } from "@/lib/format";
import type { Asset } from "@/lib/fake-data";
import { useInventory } from "@/lib/hooks";

import type { InternalRequest } from "../lib/requests";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  request: InternalRequest | null;
  onPick: (asset: Asset) => void;
};

export function AssetPickerDialog({
  open,
  onOpenChange,
  request,
  onPick,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {open && (
          <AssetPickerBody
            request={request}
            onPick={onPick}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AssetPickerBody({
  request,
  onPick,
  onClose,
}: {
  request: InternalRequest | null;
  onPick: (asset: Asset) => void;
  onClose: () => void;
}) {
  const inventory = useInventory();
  const [search, setSearch] = useState(() => request?.itemName ?? "");

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? inventory.filter((a) => {
          const hay = `${a.name} ${a.brand} ${a.sku} ${a.category}`.toLowerCase();
          return hay.includes(q);
        })
      : inventory.slice();
    const rank = (s: Asset["status"]) =>
      s === "healthy" ? 0 : s === "low" ? 1 : s === "critical" ? 2 : 3;
    return filtered
      .sort(
        (a, b) =>
          rank(a.status) - rank(b.status) || a.name.localeCompare(b.name),
      )
      .slice(0, 50);
  }, [inventory, search]);

  const needed = request?.qty ?? 0;

  return (
    <>
      <DialogHeader className="gap-1 border-b border-border/70 bg-gradient-to-b from-card/60 to-card/0 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="truncate text-[16px] font-semibold tracking-tight">
              Vincular al stock
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px]">
              Elegí qué item del inventario corresponde al pedido{" "}
              <span className="font-semibold text-foreground">
                “{request?.itemName}”
              </span>
              . Después vas a poder entregarlo y se va a descontar del stock.
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, marca o código…"
            className="h-10 pl-9"
            autoFocus
          />
        </div>

        {results.length === 0 ? (
          <div className="grid place-items-center rounded-lg bg-card px-4 py-8 text-center text-[13px] text-muted-foreground ring-1 ring-foreground/10">
            {inventory.length === 0
              ? "No hay items en el inventario todavía."
              : `Sin resultados para “${search.trim()}”.`}
          </div>
        ) : (
          <ul className="max-h-[360px] divide-y divide-border/50 overflow-y-auto rounded-lg bg-background/40 ring-1 ring-foreground/10">
            {results.map((a) => {
              const enough = a.stock >= needed;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(a);
                      onClose();
                    }}
                    className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted/60 text-muted-foreground ring-1 ring-foreground/10">
                      <Package className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium">
                        {a.name}
                      </div>
                      <div className="truncate text-[12px] text-muted-foreground">
                        {a.brand || "—"} · {a.category}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold tabular-nums leading-none ring-1",
                          stockTone(a.status),
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-current opacity-80" />
                        {a.stock} en stock
                      </span>
                      {needed > 0 && (
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            enough
                              ? "text-status-healthy"
                              : "text-status-low",
                          )}
                        >
                          {enough
                            ? `Pedís ${needed} · alcanza`
                            : `Pedís ${needed} · faltan ${needed - a.stock}`}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/30 px-5 py-3 sm:px-6">
        <p className="text-[12px] text-muted-foreground">
          {results.length}{" "}
          {results.length === 1 ? "item disponible" : "items disponibles"}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
      </footer>
    </>
  );
}
