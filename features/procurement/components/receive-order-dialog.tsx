"use client";

import { useState } from "react";
import { Package, PackageCheck, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import { cn } from "@/lib/utils";

import {
  pendingPerLine,
  totalPending,
  type PurchaseOrder,
} from "../lib/orders";
import { receiveOrderShipmentAction } from "../lib/actions";

type Props = {
  order: PurchaseOrder | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function ReceiveOrderDialog({ order, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {open && order && (
          <ReceiveOrderBody
            order={order}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReceiveOrderBody({
  order,
  onClose,
}: {
  order: PurchaseOrder;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, number>>(() => {
    const seed: Record<string, number> = {};
    const pending = pendingPerLine(order);
    for (const line of order.lines) {
      seed[line.id] = pending.get(line.id) ?? 0;
    }
    return seed;
  });

  const totalPendingQty = totalPending(order);
  const totalNow = Object.values(draft).reduce((s, n) => s + (n || 0), 0);
  const willCloseFully = order.lines.every(
    (l) => (l.receivedQty ?? 0) + (draft[l.id] ?? 0) >= l.qty,
  );

  const setLineQty = (lineId: string, raw: number, max: number) => {
    const v = Math.max(0, Math.min(max, Math.floor(raw) || 0));
    setDraft((d) => ({ ...d, [lineId]: v }));
  };

  const setAllToPending = () => {
    const next: Record<string, number> = {};
    const pending = pendingPerLine(order);
    for (const line of order.lines) {
      next[line.id] = pending.get(line.id) ?? 0;
    }
    setDraft(next);
  };

  const setAllToZero = () => {
    const next: Record<string, number> = {};
    for (const line of order.lines) next[line.id] = 0;
    setDraft(next);
  };

  const confirm = async () => {
    if (totalNow <= 0) {
      toast.error("Marcá al menos un item recibido");
      return;
    }
    const shipments = Object.entries(draft)
      .filter(([, q]) => q > 0)
      .map(([lineId, qty]) => ({ lineId, qty }));
    try {
      const res = await receiveOrderShipmentAction(order.id, shipments);
      if (!res.ok) {
        toast.error("No se pudo recibir", { description: res.reason });
        return;
      }
      const flipped = res.requestsFlipped;
      if (res.newStatus === "received") {
        toast.success("Orden recibida · completa", {
          description: `+${res.totalAdded} ${res.totalAdded === 1 ? "unidad" : "unidades"} al stock${flipped > 0 ? ` · ${flipped} pedido${flipped === 1 ? "" : "s"} listo${flipped === 1 ? "" : "s"} para entregar` : ""}`,
        });
      } else {
        toast.success("Recepción parcial registrada", {
          description: `+${res.totalAdded} al stock · falta recibir ${totalPendingQty - totalNow}${flipped > 0 ? ` · ${flipped} pedido${flipped === 1 ? "" : "s"} listo${flipped === 1 ? "" : "s"}` : ""}`,
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Falló la recepción");
    }
  };

  return (
    <>
      <DialogHeader className="gap-1 border-b border-border/70 bg-gradient-to-b from-card/60 to-card/0 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="truncate text-[16px] font-semibold tracking-tight">
              Recibir orden · {order.reference}
            </DialogTitle>
            <DialogDescription className="mt-1 text-[13px]">
              Marcá las cantidades que llegaron. Lo que falte queda pendiente
              y se puede recibir después.
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

      <div className="flex flex-col gap-3 overflow-y-auto p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {order.lines.length}{" "}
            {order.lines.length === 1 ? "item en la orden" : "items en la orden"}
            {totalPendingQty < order.lines.reduce((s, l) => s + l.qty, 0) && (
              <span className="ml-2 normal-case tracking-normal text-muted-foreground/80">
                ({totalPendingQty} pendientes)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={setAllToZero}
              className="text-muted-foreground"
            >
              Limpiar
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={setAllToPending}
            >
              Marcar todo como recibido
            </Button>
          </div>
        </div>

        <ul className="divide-y divide-border/50 rounded-xl bg-card ring-1 ring-foreground/10">
          {order.lines.map((line) => {
            const lineReceived = line.receivedQty ?? 0;
            const linePending = Math.max(0, line.qty - lineReceived);
            const current = draft[line.id] ?? 0;
            const fully = linePending === 0;
            return (
              <li
                key={line.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3",
                  fully && "opacity-60",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted/60 text-muted-foreground ring-1 ring-foreground/10">
                  <Package className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">
                    {line.name}
                  </div>
                  <div className="truncate text-[12px] text-muted-foreground">
                    {line.brand || "—"} · {line.category}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2 py-0.5 font-semibold tabular-nums text-foreground/80">
                      Pedido {line.qty}
                    </span>
                    {lineReceived > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-status-healthy-soft px-2 py-0.5 font-semibold tabular-nums text-status-healthy">
                        <PackageCheck className="size-3" />
                        {lineReceived} ya recibido
                      </span>
                    )}
                    {linePending > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-status-low-soft px-2 py-0.5 font-semibold tabular-nums text-status-low">
                        {linePending} pendiente
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Recibí ahora
                  </span>
                  <NumberInput
                    min={0}
                    max={linePending}
                    value={fully ? 0 : current}
                    onChange={(n) => setLineQty(line.id, n, linePending)}
                    disabled={fully}
                    fallback={0}
                    className="h-10 w-20 text-center font-mono tabular-nums"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/30 px-5 py-3 sm:px-6">
        <div className="text-[12.5px] text-muted-foreground">
          Suma esta entrega:{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {totalNow}
          </span>
          {totalNow > 0 && (
            <>
              {" · "}
              {willCloseFully ? (
                <span className="font-semibold text-status-healthy">
                  cierra la orden ✓
                </span>
              ) : (
                <span className="font-medium text-status-low">
                  queda parcial ({totalPendingQty - totalNow} sin recibir)
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={confirm}>
            <PackageCheck className="size-4" />
            Confirmar recepción
          </Button>
        </div>
      </footer>
    </>
  );
}
