"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { reconcileMonthlyPlanAction } from "../lib/monthly-plan-actions";

const KEY_SNAPSHOT = "invit:plan-snapshot:v1";

function loadSnapshot(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_SNAPSHOT);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveSnapshot(s: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY_SNAPSHOT, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/**
 * Componente headless: al montar, compara el snapshot anterior (en
 * localStorage del browser) con el estado actual en DB y agrega al plan
 * del mes los items que recién cruzaron a CRITICAL/OUT.
 *
 * El snapshot vive client-side a propósito: es por-browser, sólo sirve
 * para que el "auto-agrega cuando un item cruzó el umbral" tenga un
 * punto de comparación.
 */
export function MonthlyPlanReconciler() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snapshot = loadSnapshot();
      try {
        const res = await reconcileMonthlyPlanAction(snapshot);
        if (cancelled) return;
        saveSnapshot(res.nextSnapshot);
        if (res.added > 0) router.refresh();
      } catch {
        /* silencioso: no queremos toast en un componente headless */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
