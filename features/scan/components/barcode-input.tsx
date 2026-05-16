"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ScanBarcode, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { appendScanAction } from "../lib/actions";

type Props = {
  sessionId: string;
  /** Si está abierto algún modal/dialog del flujo (link de unknown,
   *  edición de qty, etc.), el input cede el foco para que el otro
   *  componente lo tome. */
  paused?: boolean;
  /** Llamado tras cada scan procesado (éxito o reconocido). El padre
   *  usa esto para refrescar la vista (router.refresh()). */
  onProcessed?: () => void;
};

export function BarcodeInput({ sessionId, paused, onProcessed }: Props) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [lastFeedback, setLastFeedback] = useState<
    | { kind: "matched"; name: string; qty: number }
    | { kind: "unknown"; barcode: string; count: number }
    | null
  >(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // La pistola escribe muy rápido + Enter. Auto-focus al montar y cada
  // vez que se cede el foco — así nunca perdemos un escaneo aunque el
  // usuario clickee fuera.
  useEffect(() => {
    if (paused) return;
    inputRef.current?.focus();
    const onClick = () => {
      if (!paused && document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };
    const id = setTimeout(onClick, 50);
    return () => clearTimeout(id);
  }, [paused, pending]);

  const submit = () => {
    const raw = value;
    if (!raw.trim()) return;
    setValue("");
    startTransition(async () => {
      try {
        const res = await appendScanAction(sessionId, raw);
        if (!res.ok) {
          toast.error("No se pudo registrar", { description: res.reason });
          return;
        }
        if (res.kind === "matched") {
          setLastFeedback({
            kind: "matched",
            name: res.assetName,
            qty: res.qty,
          });
        } else {
          setLastFeedback({
            kind: "unknown",
            barcode: res.barcode,
            count: res.count,
          });
        }
        onProcessed?.();
      } catch (err) {
        toast.error("Error al procesar", {
          description: err instanceof Error ? err.message : String(err),
        });
      } finally {
        // Re-focus después del transition para que la pistola siga andando.
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "group relative flex items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 transition-shadow",
          "focus-within:ring-2 focus-within:ring-primary/40",
          paused && "opacity-60",
        )}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30">
          {pending ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ScanBarcode className="size-5" />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <label
            htmlFor="barcode-input"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
          >
            Esperando código
          </label>
          <Input
            ref={inputRef}
            id="barcode-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={paused ? "Sesión cerrada" : "Escaneá o tipeá + Enter"}
            disabled={paused}
            autoComplete="off"
            inputMode="text"
            className="h-9 border-0 bg-transparent px-0 font-mono text-[15px] shadow-none ring-0 focus-visible:ring-0 focus-visible:border-0"
          />
        </div>
      </div>

      {lastFeedback && (
        <div
          className={cn(
            "rounded-md px-3 py-2 text-[12.5px] ring-1",
            lastFeedback.kind === "matched"
              ? "bg-status-healthy-soft text-status-healthy ring-status-healthy/30"
              : "bg-status-low-soft text-status-low ring-status-low/30",
          )}
        >
          {lastFeedback.kind === "matched" ? (
            <>
              <span className="font-semibold">{lastFeedback.name}</span>
              <span className="text-foreground/70"> · ahora hay </span>
              <span className="font-bold tabular-nums">
                {lastFeedback.qty}
              </span>
              <span className="text-foreground/70"> en la sesión</span>
            </>
          ) : (
            <>
              <span className="font-semibold font-mono">
                {lastFeedback.barcode}
              </span>
              <span className="text-foreground/70">
                {" "}
                no está en el inventario —{" "}
              </span>
              <span className="font-bold tabular-nums">
                {lastFeedback.count}
              </span>
              <span className="text-foreground/70">
                {" "}
                escaneo{lastFeedback.count === 1 ? "" : "s"} pendiente
                {lastFeedback.count === 1 ? "" : "s"}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
