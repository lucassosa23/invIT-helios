"use client";

import { useTransition } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Eraser,
  Pencil,
  Plus,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  addSuggestionToMonthlyPlanAction,
  clearMonthlyPlanAction,
} from "../lib/monthly-plan-actions";
import type { PurchaseOrder } from "../lib/orders";
import type { PlanSuggestion } from "../lib/queries";

function monthlyPlanReferenceFor(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `PO-PLAN-${y}-${m}`;
}
// Helper inline (no podemos importar de lib/helpers porque ese archivo es
// "server-only" — pero la lógica es trivial y se usa solo para mostrar la
// reference del mes cuando todavía no hay plan creado).

type Props = {
  plan: PurchaseOrder | null;
  suggestions: PlanSuggestion[];
  onEdit: (o: PurchaseOrder) => void;
};

export function MonthlyPlanCard({ plan, suggestions, onEdit }: Props) {
  const [pending, startTransition] = useTransition();

  const reference = plan?.reference ?? monthlyPlanReferenceFor();
  const monthYear = new Date()
    .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());

  // Si la reference matches `-vN`, este plan es una continuación: el plan
  // anterior del mes ya fue marcado como ready / ordered / received. Lo
  // explicamos en un badge para que no parezca un error.
  const versionMatch = plan?.reference.match(/-v(\d+)$/);
  const planVersion = versionMatch ? parseInt(versionMatch[1], 10) : null;

  const itemCount = plan?.lines.length ?? 0;
  const totalUnits = plan?.lines.reduce((s, l) => s + l.qty, 0) ?? 0;

  const handleClearPlan = () => {
    if (itemCount === 0) return;
    if (
      !window.confirm(
        `¿Vaciar el plan de ${monthYear}? Quita los ${itemCount} items del plan. Los items que sigan bajo umbral van a aparecer como sugerencia para que los sumes manualmente.`,
      )
    )
      return;
    startTransition(async () => {
      try {
        const res = await clearMonthlyPlanAction();
        toast.success("Plan vacío", {
          description:
            res.removed > 0
              ? "Los items bajo umbral aparecen abajo como sugerencia."
              : "No había items para quitar.",
        });
      } catch (err) {
        toast.error("No se pudo vaciar el plan", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  const handleAddSuggestion = (suggestion: PlanSuggestion) => {
    startTransition(async () => {
      try {
        const res = await addSuggestionToMonthlyPlanAction(suggestion.id);
        if (res.added) {
          toast.success("Sumado al plan", {
            description: `${suggestion.name} agregado a ${res.orderReference}`,
          });
        }
      } catch (err) {
        toast.error("No se pudo sumar al plan", {
          description: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  const handleAddAllSuggestions = () => {
    startTransition(async () => {
      let added = 0;
      for (const s of suggestions) {
        try {
          const res = await addSuggestionToMonthlyPlanAction(s.id);
          if (res.added) added++;
        } catch {
          /* seguimos con el resto */
        }
      }
      if (added > 0) {
        toast.success(`${added} items sumados al plan`);
      }
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl ring-1 ring-primary/30 shadow-md"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card to-card pointer-events-none" />
      <div
        aria-hidden
        className="absolute -right-12 -top-12 size-44 rounded-full bg-primary/15 blur-3xl pointer-events-none"
      />

      <div className="relative flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <CalendarClock className="size-[22px]" />
            </span>
            <div className="min-w-0">
              <div className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-primary">
                Plan de compras
              </div>
              <h2 className="truncate text-[18px] font-semibold leading-tight tracking-tight">
                {monthYear}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                <span className="font-mono text-foreground/70">{reference}</span>
                {planVersion && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-status-info-soft px-2 py-0.5 font-semibold text-status-info ring-1 ring-status-info/30"
                    title="La orden previa del mes ya fue cerrada o enviada. Este es un plan adicional para las nuevas necesidades del mismo mes."
                  >
                    Plan #{planVersion} del mes
                  </span>
                )}
                <span className="size-1 rounded-full bg-muted-foreground/40" />
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="size-3 text-primary/70" />
                  Auto-agrega items que cruzan su umbral
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {itemCount > 0 && plan && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleClearPlan}
                disabled={pending}
                className="text-muted-foreground hover:bg-status-critical/15 hover:text-status-critical"
                title="Quitar todos los items del plan"
              >
                <Eraser className="size-3.5" />
                Vaciar
              </Button>
            )}
            {plan && itemCount > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={() => onEdit(plan)}
                disabled={pending}
              >
                <Pencil className="size-3.5" />
                Editar plan
              </Button>
            )}
          </div>
        </div>

        {itemCount === 0 ? (
          <div className="rounded-xl bg-background/40 px-4 py-6 text-center ring-1 ring-foreground/10">
            <p className="text-[13.5px] font-medium text-foreground/80">
              Sin items en el plan
            </p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Cuando un item del inventario pase de OK a bajo umbral, se va a
              sumar acá automáticamente. Items que ya están bajo umbral
              aparecen como sugerencia abajo.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-6">
              <div>
                <div className="text-[30px] font-semibold leading-none tabular-nums">
                  {itemCount}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {itemCount === 1 ? "item" : "items"}
                </div>
              </div>
              <div className="h-9 w-px bg-border" />
              <div>
                <div className="text-[30px] font-semibold leading-none tabular-nums">
                  {totalUnits}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  unidades a comprar
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-background/40 px-4 py-3 ring-1 ring-foreground/10">
              <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Items en el plan
              </div>
              <ul className="grid gap-1.5">
                {plan!.lines.slice(0, 5).map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-2 text-[13px]"
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        l.isNew ? "bg-primary" : "bg-status-low",
                      )}
                    />
                    <span className="truncate font-medium">{l.name}</span>
                    {l.brand && (
                      <span className="truncate text-[12px] text-muted-foreground">
                        · {l.brand}
                      </span>
                    )}
                    <span className="ml-auto shrink-0 font-mono text-[12px] font-semibold tabular-nums text-foreground/80">
                      × {l.qty}
                    </span>
                  </li>
                ))}
                {plan!.lines.length > 5 && (
                  <li className="pt-1 text-[11.5px] italic text-muted-foreground">
                    + {plan!.lines.length - 5} más — abrí &ldquo;Editar
                    plan&rdquo; para ver todo
                  </li>
                )}
              </ul>
            </div>
          </>
        )}

        {suggestions.length > 0 && (
          <div className="rounded-xl bg-background/40 px-4 py-3 ring-1 ring-status-low/30">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-status-low">
                <AlertTriangle className="size-3" />
                Sugerencias para sumar
                <span className="rounded-full bg-status-low-soft px-1.5 py-0.5 text-[10px] font-bold text-status-low tabular-nums">
                  {suggestions.length}
                </span>
              </div>
              {suggestions.length > 1 && (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={handleAddAllSuggestions}
                  disabled={pending}
                  className="text-primary hover:text-primary/80"
                >
                  Sumar todos
                </Button>
              )}
            </div>
            <p className="mb-2 text-[11.5px] text-muted-foreground">
              Items bajo umbral que NO se agregaron automáticamente. Pueden
              haber estado ya por debajo antes de que arrancara el plan, o
              fueron items que vos sacaste.
            </p>
            <ul className="grid gap-1.5">
              {suggestions.slice(0, 6).map((a) => (
                <li
                  key={a.id}
                  className="rounded-md px-2 py-1.5 hover:bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        a.status === "out"
                          ? "bg-status-out"
                          : a.status === "critical"
                            ? "bg-status-critical"
                            : "bg-status-low",
                      )}
                    />
                    <span className="truncate text-[13px] font-medium">
                      {a.name}
                    </span>
                    <span className="truncate text-[11.5px] text-muted-foreground">
                      · stock {a.stock} / mín. {a.threshold}
                    </span>
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => handleAddSuggestion(a)}
                      disabled={pending}
                      className="ml-auto shrink-0"
                    >
                      <Plus className="size-3" />
                      Sumar
                    </Button>
                  </div>
                </li>
              ))}
              {suggestions.length > 6 && (
                <li className="px-2 pt-1 text-[11.5px] italic text-muted-foreground">
                  + {suggestions.length - 6} más
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </motion.section>
  );
}
