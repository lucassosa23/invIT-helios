import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

/** Schema reusable para IDs que vienen del cliente (Prisma cuid). Los
 *  Server Actions deben usarlo en toda función que reciba un id como
 *  parámetro: previene que el cliente mande algo arbitrario al ORM. */
export const idSchema = z.cuid();

/** Helper para parsear un id desde el cliente y tirar mensaje claro si
 *  no matchea. */
export function parseId(raw: unknown, fieldName = "id"): string {
  const r = idSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(`${fieldName} inválido.`);
  }
  return r.data;
}

/** Genera un SKU determinístico a partir de category + brand + sufijo random.
 *  Usado al crear assets desde inventory y desde recepción de órdenes. */
export function makeSku(category: string, brand: string): string {
  const c = (category.slice(0, 3) || "NEW").toUpperCase();
  const b = (brand.slice(0, 3) || "GEN").toUpperCase();
  const rand = Math.random().toString(36).slice(-4).toUpperCase();
  return `${c}-${b}-${rand}`;
}

/** Mes-año en formato "YYYY-MM". Usado para identificar el plan mensual. */
export function monthYearString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Reference canónica del plan mensual: `PO-PLAN-YYYY-MM`. */
export function monthlyPlanReferenceFor(d: Date = new Date()): string {
  return `PO-PLAN-${monthYearString(d)}`;
}

/** Revalida los paths que pueden cambiar tras una mutación de dominio.
 *  Las pages relevantes (dashboard, inventory, requests, procurement,
 *  reports) se recomponen en el próximo render. */
export function revalidateDomainPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/requests");
  revalidatePath("/procurement");
  revalidatePath("/reports");
}
