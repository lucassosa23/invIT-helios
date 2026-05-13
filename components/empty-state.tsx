import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  features?: string[];
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  features,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-xl border border-border bg-card",
        className,
      )}
    >
      <div className="absolute inset-0 -z-10 bg-grid opacity-[0.18]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-radial-fade" />
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <div className="grid size-12 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
          <Icon className="size-5" strokeWidth={2} />
        </div>
        <h3 className="mt-5 text-base font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {features && features.length > 0 && (
          <ul className="mt-6 grid w-full max-w-md gap-1.5 text-left text-[13px] text-muted-foreground">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/60" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        )}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  );
}
