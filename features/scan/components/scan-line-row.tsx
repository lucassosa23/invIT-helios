"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";

import {
  removeScanLineAction,
  updateScanLineQtyAction,
} from "../lib/actions";
import type { ScanKind, ScanLine } from "../lib/scan";

type Props = {
  line: ScanLine;
  kind: ScanKind;
  readOnly?: boolean;
  onChanged?: () => void;
};

export function ScanLineRow({ line, kind, readOnly, onChanged }: Props) {
  const [qty, setQty] = useState(line.qty);
  const [pending, startTransition] = useTransition();

  const projectedStock =
    kind === "in" ? line.currentStock + qty : line.currentStock - qty;
  const stockTooLow = kind === "out" && projectedStock < 0;

  const commitQty = (next: number) => {
    if (next < 1 || next > 100000) return;
    setQty(next);
    startTransition(async () => {
      try {
        await updateScanLineQtyAction(line.id, next);
        onChanged?.();
      } catch (err) {
        toast.error("No se pudo actualizar la cantidad", {
          description: err instanceof Error ? err.message : String(err),
        });
        setQty(line.qty);
      }
    });
  };

  const remove = () => {
    if (!window.confirm(`¿Quitar "${line.assetName}" de la sesión?`)) return;
    startTransition(async () => {
      try {
        await removeScanLineAction(line.id);
        onChanged?.();
      } catch (err) {
        toast.error("No se pudo quitar", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/20",
        stockTooLow && "ring-status-critical/40",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[14px] font-semibold leading-tight">
            {line.assetName}
          </span>
          {line.assetBrand && (
            <span className="text-[12px] text-muted-foreground">
              · {line.assetBrand}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
          <span>{line.assetCategory || "Otros"}</span>
          <span className="size-1 rounded-full bg-muted-foreground/40" />
          <span className="font-mono tabular-nums">
            stock {line.currentStock}
          </span>
          <span className="size-1 rounded-full bg-muted-foreground/40" />
          <span
            className={cn(
              "font-mono tabular-nums",
              stockTooLow ? "text-status-critical" : "text-foreground/80",
            )}
          >
            → {projectedStock}
          </span>
          <span className="size-1 rounded-full bg-muted-foreground/40" />
          <span>{formatRelative(line.lastScanAt)}</span>
        </div>
        {stockTooLow && (
          <p className="mt-1 text-[11.5px] font-medium text-status-critical">
            No alcanza el stock para descontar esta cantidad.
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => commitQty(qty - 1)}
          disabled={readOnly || pending || qty <= 1}
          aria-label="Restar uno"
        >
          <Minus className="size-3.5" />
        </Button>
        <div
          className={cn(
            "min-w-10 rounded-md bg-muted/40 px-2 py-1 text-center font-mono text-[14px] font-semibold tabular-nums ring-1 ring-foreground/10",
            pending && "opacity-60",
          )}
        >
          {qty}
        </div>
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={() => commitQty(qty + 1)}
          disabled={readOnly || pending}
          aria-label="Sumar uno"
        >
          <Plus className="size-3.5" />
        </Button>
        {!readOnly && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={remove}
            disabled={pending}
            className="ml-1 text-muted-foreground hover:bg-status-critical/15 hover:text-status-critical"
            aria-label="Quitar"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>
    </motion.li>
  );
}
