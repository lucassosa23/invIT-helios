"use client";

import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SectionCard({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <Card
      className={cn(
        "animate-fade-in-up gap-0 py-0 transition-shadow hover:ring-foreground/15",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-5 py-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {Icon && (
          <span
            aria-hidden
            className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20"
          >
            <Icon className="size-3.5" strokeWidth={2} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-[14.5px] font-semibold leading-tight tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function SectionFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <footer
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-5 py-3 text-[12px] text-muted-foreground",
        className,
      )}
    >
      {children}
    </footer>
  );
}

export function SettingRow({
  label,
  description,
  children,
  align = "center",
  htmlFor,
  className,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  align?: "start" | "center";
  htmlFor?: string;
  className?: string;
}) {
  const isCenter = align === "center";
  return (
    <div
      className={cn(
        "grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(260px,360px)]",
        isCenter ? "sm:items-center" : "sm:items-start",
        "border-b border-border/60 last:border-b-0",
        className,
      )}
    >
      <div className="min-w-0">
        <label
          htmlFor={htmlFor}
          className="block text-[13px] font-medium leading-tight"
        >
          {label}
        </label>
        {description && (
          <p className="mt-1 max-w-md text-[12px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function FieldGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-4 px-5 py-5 sm:grid-cols-2", className)}
    >
      {children}
    </div>
  );
}

export function FieldGroup({
  label,
  hint,
  children,
  className,
  span,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  span?: "full" | "half";
}) {
  return (
    <div className={cn(span === "full" && "sm:col-span-2", className)}>
      <label className="block text-[12px] font-medium leading-tight text-foreground">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
