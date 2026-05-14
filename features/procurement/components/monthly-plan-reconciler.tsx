"use client";

import { useEffect } from "react";

import { subscribeInventory } from "@/lib/storage";

import { reconcileMonthlyPlan } from "../lib/monthly-plan";

/**
 * Componente headless montado en el app shell: subscribe a cambios del
 * inventario y dispara reconcileMonthlyPlan() — agrega al plan del mes los
 * items que cruzaron el umbral, respetando los descartados por el usuario.
 *
 * No renderiza nada; solo gatilla efectos.
 */
export function MonthlyPlanReconciler() {
  useEffect(() => {
    // Primera corrida al montar (cubre el caso de cambios mientras la app
    // estuvo cerrada).
    reconcileMonthlyPlan();
    return subscribeInventory(() => {
      reconcileMonthlyPlan();
    });
  }, []);

  return null;
}
