"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import {
  SETTINGS_GROUPS,
  SETTINGS_SECTIONS,
  findSection,
  type SettingsSection,
} from "@/features/settings/lib/sections";

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const currentId = pathname.split("/")[2] ?? "general";
  const current = findSection(currentId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SETTINGS_SECTIONS;
    return SETTINGS_SECTIONS.filter((s) => {
      const hay =
        `${s.label} ${s.description} ${(s.keywords ?? []).join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const eyebrow = current
    ? `Workspace · ${current.label}`
    : "Workspace";

  const title = current ? current.label : "Ajustes";
  const description = current
    ? current.description
    : "Configuración del workspace.";

  const action = current?.badge ? (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ring-1",
        current.badge === "danger" &&
          "bg-destructive/10 text-destructive ring-destructive/30",
        current.badge === "soon" &&
          "bg-muted text-muted-foreground ring-foreground/10",
        current.badge === "new" &&
          "bg-primary/10 text-primary ring-primary/25",
      )}
    >
      {current.badge === "danger" && "Cuidado"}
      {current.badge === "soon" && "Próximamente"}
      {current.badge === "new" && "Nuevo"}
    </span>
  ) : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={action}
        className="pb-2"
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ajuste…"
              className="h-9 pl-8 text-[13px]"
            />
          </div>

          <nav className="flex flex-col gap-3 text-sm">
            {SETTINGS_GROUPS.map((group) => {
              const items = filtered.filter((s) => s.group === group.id);
              if (items.length === 0) return null;
              return (
                <div key={group.id}>
                  <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                    {group.label}
                  </div>
                  <ul className="space-y-0.5">
                    {items.map((section) => (
                      <SettingsNavItem
                        key={section.id}
                        section={section}
                        active={section.id === currentId}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/70 p-3 text-center text-[12px] text-muted-foreground">
                Sin coincidencias para &ldquo;{query}&rdquo;
              </div>
            )}
          </nav>

          <div className="mt-6 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 size-3.5 text-primary" />
              <div className="min-w-0 flex-1 text-[12px] leading-snug text-muted-foreground">
                <div className="text-[12.5px] font-medium text-foreground">
                  Tip
                </div>
                Usá{" "}
                <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
                  ⌘ K
                </kbd>{" "}
                para saltar a cualquier ajuste sin scrollear.
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

function SettingsNavItem({
  section,
  active,
}: {
  section: SettingsSection;
  active: boolean;
}) {
  const Icon = section.icon;
  return (
    <li className="relative">
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1.5 left-0 w-[2.5px] rounded-full bg-primary"
        />
      )}
      <Link
        href={section.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group/sn flex h-8 items-center gap-2 rounded-md px-3 text-[13px] font-medium transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon
          className={cn(
            "size-3.5 transition-colors",
            active
              ? "text-primary"
              : "text-muted-foreground/80 group-hover/sn:text-foreground",
          )}
          strokeWidth={2}
        />
        <span className="flex-1 truncate">{section.label}</span>
        {section.badge === "danger" && (
          <span className="size-1.5 rounded-full bg-destructive/80" />
        )}
        {section.badge === "soon" && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider text-muted-foreground">
            soon
          </span>
        )}
        {section.badge === "new" && (
          <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider text-primary">
            new
          </span>
        )}
      </Link>
    </li>
  );
}
