"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[invIT] segment error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
      <div className="grid size-12 place-items-center rounded-2xl bg-status-critical-soft text-status-critical ring-1 ring-status-critical/30">
        <AlertTriangle className="size-5" strokeWidth={2} />
      </div>
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="text-[18px] font-semibold tracking-tight">
          Esta sección no pudo cargar
        </h2>
        <p className="text-[13px] text-muted-foreground">
          El resto de la app sigue funcionando. Probá reintentar o navegá a
          otra sección desde la barra lateral.
        </p>
        {error.digest && (
          <p className="font-mono text-[11px] text-muted-foreground/70">
            ref · {error.digest}
          </p>
        )}
      </div>
      <Button size="sm" onClick={reset}>
        <RefreshCcw className="size-3.5" />
        Reintentar
      </Button>
    </div>
  );
}
