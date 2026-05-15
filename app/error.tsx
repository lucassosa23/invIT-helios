"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCcw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[invIT] unhandled error:", error);
  }, [error]);

  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 text-center text-foreground">
      <div className="flex max-w-md flex-col items-center gap-4">
        <div className="grid size-12 place-items-center rounded-2xl bg-status-critical-soft text-status-critical ring-1 ring-status-critical/30">
          <AlertTriangle className="size-5" strokeWidth={2} />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight">
          Algo salió mal
        </h1>
        <p className="text-[13.5px] text-muted-foreground">
          Hubo un error inesperado al cargar esta pantalla. Probá refrescar o
          volver al inicio. Si persiste, revisá la consola.
        </p>
        {error.digest && (
          <p className="font-mono text-[11px] text-muted-foreground/70">
            ref · {error.digest}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" onClick={reset}>
            <RefreshCcw className="size-3.5" />
            Reintentar
          </Button>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ArrowLeft className="size-3.5" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
