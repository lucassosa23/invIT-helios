"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ExclusionItemDetail = {
  name: string;
  brand?: string;
  category?: string;
  qty: number;
  isNew?: boolean;
};

export type ExclusionItem = {
  id: string;
  title: string;
  subtitle?: string;
  /** Si está presente, la fila es expandible para ver el contenido (ej. items de una orden). */
  details?: ExclusionItemDetail[];
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  items: ExclusionItem[];
  exclusions: Set<string>;
  onToggle: (id: string, excluded: boolean) => void;
};

export function ExclusionDrawer({
  open,
  onOpenChange,
  title,
  items,
  exclusions,
  onToggle,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }, [items, query]);

  const includedCount = items.filter((i) => !exclusions.has(i.id)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogHeader className="gap-1 border-b border-border/70 bg-gradient-to-b from-card/60 to-card/0 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate text-[16px] font-semibold tracking-tight">
                Editar selección · {title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[12.5px]">
                Destildá los items que NO querés que aparezcan en el reporte.
                Las exclusiones persisten — el día que se envíe el reporte,
                solo va lo tildado.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar"
              className="-mr-1 -mt-1 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 overflow-hidden p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {includedCount} de {items.length} incluidos
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => items.forEach((i) => onToggle(i.id, true))}
                className="text-muted-foreground"
              >
                Excluir todos
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => items.forEach((i) => onToggle(i.id, false))}
              >
                Incluir todos
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="h-9 pl-9"
            />
          </div>

          {items.length === 0 ? (
            <div className="grid place-items-center rounded-lg bg-background/40 px-4 py-8 text-center text-[12.5px] text-muted-foreground ring-1 ring-foreground/10">
              No hay items en esta sección todavía.
            </div>
          ) : (
            <ul className="max-h-[400px] divide-y divide-border/40 overflow-y-auto rounded-lg bg-background/40 ring-1 ring-foreground/10">
              {filtered.map((item) => (
                <ExclusionRow
                  key={item.id}
                  item={item}
                  excluded={exclusions.has(item.id)}
                  onToggle={(excluded) => onToggle(item.id, excluded)}
                />
              ))}
              {filtered.length === 0 && (
                <li className="px-4 py-3 text-center text-[12px] text-muted-foreground">
                  Sin resultados.
                </li>
              )}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-5 py-3 sm:px-6">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Listo
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function ExclusionRow({
  item,
  excluded,
  onToggle,
}: {
  item: ExclusionItem;
  excluded: boolean;
  onToggle: (excluded: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = !!item.details && item.details.length > 0;

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 transition-colors",
          excluded && "opacity-50",
        )}
      >
        <input
          type="checkbox"
          checked={!excluded}
          onChange={(e) => onToggle(!e.target.checked)}
          className="size-4 shrink-0 accent-primary"
          aria-label={`Incluir ${item.title}`}
        />
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "truncate text-[13px]",
              excluded
                ? "text-muted-foreground line-through"
                : "font-medium text-foreground",
            )}
          >
            {item.title}
          </div>
          {item.subtitle && (
            <div className="truncate text-[11.5px] text-muted-foreground">
              {item.subtitle}
            </div>
          )}
        </div>
        {hasDetails && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            aria-label={expanded ? "Ocultar items" : "Ver items"}
            title={expanded ? "Ocultar items" : "Ver items adentro"}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                expanded && "rotate-180",
              )}
            />
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {hasDetails && expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-border/30 bg-muted/20"
          >
            <ul className="divide-y divide-border/20 pl-11 pr-4 py-2">
              {item.details!.map((d, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 py-1.5 text-[12px]"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span className="truncate font-medium text-foreground/90">
                    {d.name}
                  </span>
                  {d.isNew && (
                    <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-primary">
                      nuevo
                    </span>
                  )}
                  {(d.brand || d.category) && (
                    <span className="truncate text-[11px] text-muted-foreground">
                      · {d.brand || "—"}
                      {d.category ? ` · ${d.category}` : ""}
                    </span>
                  )}
                  <span className="ml-auto shrink-0 font-mono text-[12px] font-semibold tabular-nums text-foreground/80">
                    × {d.qty}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
