"use client";

import { useState, useTransition } from "react";
import { HelpCircle, Link2, PackagePlus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";

import { dismissUnknownAction } from "../lib/actions";
import type { UnknownScan } from "../lib/scan";
import { LinkUnknownDialog } from "./link-unknown-dialog";
import { CreateFromUnknownDialog } from "./create-from-unknown-dialog";

type Props = {
  unknown: UnknownScan;
  onChanged?: () => void;
  onDialogOpenChange?: (open: boolean) => void;
};

export function UnknownScanRow({
  unknown,
  onChanged,
  onDialogOpenChange,
}: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleDialog = (kind: "link" | "create", open: boolean) => {
    if (kind === "link") setLinkOpen(open);
    else setCreateOpen(open);
    onDialogOpenChange?.(open);
  };

  const dismiss = () => {
    if (
      !window.confirm(
        `¿Descartar el código ${unknown.barcode}? Vas a perder los ${unknown.count} escaneo${unknown.count === 1 ? "" : "s"} pendientes.`,
      )
    )
      return;
    startTransition(async () => {
      try {
        await dismissUnknownAction(unknown.id);
        onChanged?.();
      } catch (err) {
        toast.error("No se pudo descartar", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  return (
    <>
      <motion.li
        layout
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-status-low-soft/40 px-4 py-3 ring-1 ring-status-low/30"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-status-low/15 text-status-low ring-1 ring-status-low/30">
          <HelpCircle className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="font-mono text-[13.5px] font-semibold text-foreground">
            {unknown.barcode}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11.5px] text-muted-foreground">
            <span className="font-semibold tabular-nums text-status-low">
              ×{unknown.count}
            </span>
            <span>
              {unknown.count === 1 ? "escaneo" : "escaneos"} sin resolver
            </span>
            <span className="size-1 rounded-full bg-muted-foreground/40" />
            <span>{formatRelative(unknown.firstScanAt)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => handleDialog("link", true)}
            disabled={pending}
          >
            <Link2 className="size-3.5" />
            Vincular
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => handleDialog("create", true)}
            disabled={pending}
          >
            <PackagePlus className="size-3.5" />
            Crear nuevo
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={dismiss}
            disabled={pending}
            className="text-muted-foreground hover:bg-status-critical/15 hover:text-status-critical"
            aria-label="Descartar"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </motion.li>

      <LinkUnknownDialog
        open={linkOpen}
        onOpenChange={(v) => handleDialog("link", v)}
        unknown={unknown}
        onLinked={onChanged}
      />
      <CreateFromUnknownDialog
        open={createOpen}
        onOpenChange={(v) => handleDialog("create", v)}
        unknown={unknown}
        onCreated={onChanged}
      />
    </>
  );
}
