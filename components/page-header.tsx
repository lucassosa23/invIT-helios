import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "animate-fade-in-up flex flex-wrap items-end justify-between gap-3 pb-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <div className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <span className="size-1 rounded-full bg-primary/70" />
            {eyebrow}
          </div>
        )}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}
