"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { findActiveNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const active = findActiveNav(pathname);
  const segments = pathname.split("/").filter(Boolean);
  const rest = active
    ? segments.slice(1).map((seg, i) => ({
        label: decodeURIComponent(seg)
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (m) => m.toUpperCase()),
        href: "/" + segments.slice(0, i + 2).join("/"),
      }))
    : [];

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1 text-[13px] text-muted-foreground",
        className,
      )}
    >
      <Link
        href="/dashboard"
        className="text-muted-foreground/70 transition-colors hover:text-foreground"
      >
        invIT
      </Link>
      {active && (
        <>
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <Link
            href={active.href}
            className={cn(
              "transition-colors hover:text-foreground",
              rest.length === 0 && "font-medium text-foreground",
            )}
          >
            {active.label}
          </Link>
        </>
      )}
      {rest.map((s, i) => (
        <span key={s.href} className="flex items-center gap-1">
          <ChevronRight className="size-3.5 text-muted-foreground/50" />
          <Link
            href={s.href}
            className={cn(
              "transition-colors hover:text-foreground",
              i === rest.length - 1 && "font-medium text-foreground",
            )}
          >
            {s.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
