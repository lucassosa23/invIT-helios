"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { primaryNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      data-slot="sidebar"
      className="hidden h-svh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex"
    >
      <div className="flex h-16 items-center px-4">
        <button
          type="button"
          className="group flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-sidebar-accent"
        >
          <BrandMark />
          <ChevronsUpDown className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {primaryNav.map((section, i) => (
          <div key={i} className={cn("py-2.5", i > 0 && "mt-1.5")}>
            {section.label && (
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
                {section.label}
              </div>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href} className="relative">
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary"
                      />
                    )}
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group/nav flex h-10 items-center gap-3 rounded-md px-3 text-[14px] font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[18px] transition-colors",
                          active
                            ? "text-primary"
                            : "text-muted-foreground group-hover/nav:text-foreground",
                        )}
                        strokeWidth={2}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-md p-2 hover:bg-sidebar-accent">
          <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-primary/10 text-[12.5px] font-semibold text-primary-foreground ring-1 ring-primary/30">
            LS
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13.5px] font-medium">
              Lucas Sosa
            </div>
            <div className="truncate text-[11.5px] text-muted-foreground">
              Helios Salud · IT
            </div>
          </div>
          <span className="dot-live" aria-label="en línea" />
        </div>
      </div>
    </aside>
  );
}
