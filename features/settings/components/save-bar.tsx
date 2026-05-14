"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SaveBar({
  dirty,
  saving = false,
  onSave,
  onDiscard,
  hint,
}: {
  dirty: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  hint?: string;
}) {
  return (
    <AnimatePresence>
      {dirty && (
        <motion.div
          initial={{ y: 56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
        >
          <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-xl border border-border/80 bg-popover/95 px-3 py-2 text-sm shadow-lg ring-1 ring-foreground/10 backdrop-blur supports-backdrop-filter:bg-popover/70">
            <span className="flex size-2 shrink-0 rounded-full bg-status-low/80" />
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-medium">
                Cambios sin guardar
              </div>
              {hint && (
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {hint}
                </div>
              )}
            </div>
            {onDiscard && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDiscard}
                disabled={saving}
              >
                Descartar
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" /> Guardando…
                </>
              ) : (
                <>Guardar cambios</>
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useDirtyState<T>(initial: T) {
  const [base, setBase] = useState<T>(initial);
  const [draft, setDraft] = useState<T>(initial);
  const dirty = JSON.stringify(base) !== JSON.stringify(draft);

  useEffect(() => {
    const apply = () => {
      setBase(initial);
      setDraft(initial);
    };
    apply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initial)]);

  return {
    value: draft,
    setValue: setDraft,
    base,
    setBase,
    dirty,
    reset: () => setDraft(base),
    commit: (next?: T) => {
      const v = next ?? draft;
      setBase(v);
      setDraft(v);
    },
  };
}

export function SaveHint({
  saved,
  className,
}: {
  saved: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {saved && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={cn(
            "inline-flex items-center gap-1 text-[12px] text-status-healthy",
            className,
          )}
        >
          <Check className="size-3.5" /> Guardado
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function ExternalDocsLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "inline-flex items-center gap-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {children}
      <ArrowUpRight className="size-3" />
    </a>
  );
}
