import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 text-center text-foreground">
      <div className="flex max-w-md flex-col items-center gap-4">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
          <Compass className="size-5" strokeWidth={2} />
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight">
          No encontramos esta pantalla
        </h1>
        <p className="text-[13.5px] text-muted-foreground">
          El enlace puede estar mal escrito o la sección ya no existe. Volvé al
          inicio y seguí desde ahí.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <ArrowLeft className="size-3.5" />
            Volver al inicio
          </Link>
          <Link
            href="/inventory"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Ir al inventario
          </Link>
        </div>
      </div>
    </div>
  );
}
