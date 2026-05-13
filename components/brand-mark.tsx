import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  withWordmark = true,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative grid size-7 place-items-center rounded-md bg-gradient-to-br from-primary/30 to-primary/10 text-primary ring-1 ring-primary/30">
        <Boxes className="size-3.5" strokeWidth={2.2} />
        <span className="pointer-events-none absolute -bottom-1 -right-1 size-1.5 rounded-full bg-status-healthy ring-2 ring-background" />
      </div>
      {withWordmark && (
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold tracking-tight">invIT</span>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Gestión IT
          </span>
        </div>
      )}
    </div>
  );
}
