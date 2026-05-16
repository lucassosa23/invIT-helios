"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Inbox,
  Ban,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  cancelScanSessionAction,
  confirmScanSessionAction,
} from "../lib/actions";
import {
  KIND_LABEL,
  KIND_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  type ScanSession,
} from "../lib/scan";
import { BarcodeInput } from "./barcode-input";
import { ScanLineRow } from "./scan-line-row";
import { UnknownScanRow } from "./unknown-scan-row";

type Props = {
  session: ScanSession;
};

export function ScanShell({ session }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Pausa el auto-focus del BarcodeInput mientras hay un dialog abierto
  // (link / create-from-unknown), así el modal puede tomar el foco sin
  // que se lo robe el input.
  const [dialogOpen, setDialogOpen] = useState(false);

  const isOpen = session.status === "open";
  const totalUnits = useMemo(
    () => session.lines.reduce((s, l) => s + l.qty, 0),
    [session.lines],
  );
  const hasUnknowns = session.unknowns.length > 0;
  const hasLines = session.lines.length > 0;
  const kindTone = KIND_TONE[session.kind];
  const statusTone = STATUS_TONE[session.status];

  const refresh = () => router.refresh();

  const cancel = () => {
    if (!window.confirm("¿Cancelar la sesión? Se pierden todos los escaneos.")) return;
    startTransition(async () => {
      try {
        await cancelScanSessionAction(session.id);
        toast.info("Sesión cancelada");
        router.push("/scan");
        router.refresh();
      } catch (err) {
        toast.error("No se pudo cancelar", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  const confirm = () => {
    if (!hasLines) {
      toast.error("No hay items para aplicar");
      return;
    }
    if (hasUnknowns) {
      toast.error("Resolvé los códigos desconocidos antes de confirmar");
      return;
    }
    const verb = session.kind === "in" ? "sumar al" : "restar del";
    if (
      !window.confirm(
        `¿Confirmar la sesión? Se van a ${verb} inventario ${totalUnits} unidad${totalUnits === 1 ? "" : "es"} (${session.lines.length} item${session.lines.length === 1 ? "" : "s"}).`,
      )
    )
      return;
    startTransition(async () => {
      try {
        const res = await confirmScanSessionAction(session.id);
        if (!res.ok) {
          toast.error("No se pudo confirmar", { description: res.reason });
          return;
        }
        toast.success("Sesión aplicada al inventario", {
          description: `${res.applied} ítems · ${res.totalDelta} unidad${res.totalDelta === 1 ? "" : "es"} ${session.kind === "in" ? "sumadas" : "restadas"}`,
        });
        router.refresh();
      } catch (err) {
        toast.error("Error inesperado", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Link
            href="/scan"
            className={cn(
              buttonVariants({ variant: "ghost", size: "xs" }),
              "self-start text-muted-foreground",
            )}
          >
            <ChevronLeft className="size-3.5" />
            Todas las sesiones
          </Link>
          <h1 className="text-[20px] font-semibold tracking-tight">
            {session.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none ring-1",
                kindTone.bg,
                kindTone.text,
                kindTone.ring,
              )}
            >
              <span className={cn("size-1.5 rounded-full", kindTone.dot)} />
              {KIND_LABEL[session.kind]}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none ring-1",
                statusTone.bg,
                statusTone.text,
                statusTone.ring,
              )}
            >
              <span
                className={cn("size-1.5 rounded-full", statusTone.dot)}
              />
              {STATUS_LABEL[session.status]}
            </span>
            <span className="size-1 rounded-full bg-muted-foreground/40" />
            <span className="tabular-nums">
              {session.lines.length} ítem
              {session.lines.length === 1 ? "" : "s"}
            </span>
            <span>·</span>
            <span className="tabular-nums">
              {totalUnits} unidad{totalUnits === 1 ? "" : "es"}
            </span>
            {hasUnknowns && (
              <>
                <span>·</span>
                <span className="font-semibold text-status-low">
                  {session.unknowns.length} sin resolver
                </span>
              </>
            )}
          </div>
        </div>

        {isOpen && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={cancel}
              disabled={pending}
              className="text-muted-foreground hover:bg-status-critical/15 hover:text-status-critical"
            >
              <Ban className="size-3.5" />
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirm}
              disabled={pending || !hasLines || hasUnknowns}
              className="bg-status-healthy text-white hover:brightness-110"
            >
              <CheckCircle2 className="size-3.5" />
              Confirmar y aplicar
            </Button>
          </div>
        )}
      </div>

      {/* Scanner */}
      {isOpen && (
        <BarcodeInput
          sessionId={session.id}
          paused={dialogOpen || pending}
          onProcessed={refresh}
        />
      )}

      {/* Desconocidos */}
      {hasUnknowns && (
        <section className="flex flex-col gap-2">
          <header className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-status-low">
            <AlertTriangle className="size-3.5" />
            Códigos desconocidos
            <span className="rounded-full bg-status-low-soft px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-status-low">
              {session.unknowns.length}
            </span>
          </header>
          <p className="text-[12.5px] text-muted-foreground">
            Estos códigos no están en el inventario. Vinculalos a un item
            existente o creá uno nuevo antes de confirmar.
          </p>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {session.unknowns.map((u) => (
                <UnknownScanRow
                  key={u.id}
                  unknown={u}
                  onChanged={refresh}
                  onDialogOpenChange={setDialogOpen}
                />
              ))}
            </AnimatePresence>
          </ul>
        </section>
      )}

      {/* Items */}
      <section className="flex flex-col gap-2">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Sparkles className="size-3.5 text-primary/70" />
            Items en la sesión
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-foreground/80">
              {session.lines.length}
            </span>
          </div>
        </header>
        {hasLines ? (
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {session.lines.map((l) => (
                <ScanLineRow
                  key={l.id}
                  line={l}
                  kind={session.kind}
                  readOnly={!isOpen}
                  onChanged={refresh}
                />
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <div className="grid place-items-center rounded-xl bg-card px-4 py-10 text-center ring-1 ring-foreground/10">
            <div className="flex flex-col items-center gap-2">
              <span className="grid size-10 place-items-center rounded-full bg-muted/60 text-muted-foreground ring-1 ring-foreground/5">
                <Inbox className="size-4" />
              </span>
              <p className="text-[13px] font-medium text-foreground/80">
                Todavía no escaneaste nada
              </p>
              <p className="max-w-[36ch] text-[12px] text-muted-foreground">
                Apuntá con la pistola, o tipeá el código y apretá Enter. Cada
                escaneo suma 1 unidad al item correspondiente.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
