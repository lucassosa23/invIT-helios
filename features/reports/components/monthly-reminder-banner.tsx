"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Mail, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import {
  shouldRemindForMonthlyReport,
  subscribeConfig,
} from "../lib/report-config";
import {
  loadPreferences,
  subscribePreferences,
} from "@/features/settings/lib/preferences";

const KEY_DISMISSED_REMINDER = "invit:email-reminder-dismissed:v1";

function isDismissedForThisSession(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(KEY_DISMISSED_REMINDER) === "1";
}

function dismissForSession() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY_DISMISSED_REMINDER, "1");
}

/**
 * Banner global que aparece entre el día 1 y 5 del mes si todavía no
 * mandaste el reporte mensual. Se puede cerrar (no molesta por el resto
 * de la sesión) o accionar yendo a /reports.
 */
export function MonthlyReminderBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const compute = () => {
      const prefs = loadPreferences();
      const should =
        prefs.showActivityBanner &&
        shouldRemindForMonthlyReport() &&
        !isDismissedForThisSession();
      setShow(should);
    };
    compute();
    const u1 = subscribeConfig(compute);
    const u2 = subscribePreferences(compute);
    return () => {
      u1();
      u2();
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="sticky top-0 z-40 border-b border-primary/30 bg-gradient-to-r from-primary/15 via-primary/8 to-transparent px-4 py-2.5 backdrop-blur"
        >
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/20 text-primary ring-1 ring-primary/30">
              <CalendarClock className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-tight">
                Es momento de enviar el reporte mensual
              </p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                Revisá qué incluye, ajustá lo que necesite, y enviá cuando
                estés listo.
              </p>
            </div>
            <Link
              href="/reports"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Mail className="size-3.5" />
              Revisar reporte
            </Link>
            <button
              type="button"
              onClick={() => {
                dismissForSession();
                setShow(false);
              }}
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              aria-label="Ocultar por esta sesión"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
