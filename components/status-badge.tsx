import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium leading-5",
  {
    variants: {
      status: {
        healthy: "bg-status-healthy-soft text-status-healthy",
        low: "bg-status-low-soft text-status-low",
        critical: "bg-status-critical-soft text-status-critical",
        out: "bg-status-out-soft text-status-out",
        info: "bg-status-info-soft text-status-info",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      status: "neutral",
    },
  },
);

type StatusKey = NonNullable<VariantProps<typeof statusBadgeVariants>["status"]>;

const labelMap: Record<StatusKey, string> = {
  healthy: "Disponible",
  low: "Bajo",
  critical: "Crítico",
  out: "Agotado",
  info: "Información",
  neutral: "—",
};

type StatusBadgeProps = VariantProps<typeof statusBadgeVariants> & {
  className?: string;
  label?: string;
  withDot?: boolean;
};

export function StatusBadge({
  status,
  withDot = true,
  label,
  className,
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)}>
      {withDot && (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-current opacity-90"
        />
      )}
      {label ?? labelMap[(status ?? "neutral") as StatusKey]}
    </span>
  );
}
