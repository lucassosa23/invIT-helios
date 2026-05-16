import "server-only";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

/** Schema reusable para IDs que vienen del cliente. Acepta cuid (formato
 *  Prisma) y también los ids prefijados del seed legacy (`ast_001`,
 *  `req_001`, etc.). Filtra cualquier cosa que no sea alfanumérico /
 *  underscore / hyphen, así nada raro llega al ORM. */
export const idSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-zA-Z0-9_-]+$/, "id inválido");

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

/** Tags de unstable_cache que las queries del dominio usan. Mutar
 *  cualquier entidad invalida el cache server-side de TODAS las queries
 *  tageadas — es defensivo: una receive afecta inventory + orders +
 *  requests, así que en vez de afinar caso por caso preferimos sobre-
 *  invalidar (las queries son rápidas y se recalculan cuando alguien
 *  navega de nuevo). */
export const CACHE_TAGS = {
  inventory: "inventory",
  orders: "orders",
  requests: "requests",
} as const;

/** Revalida path-based + tag-based.
 *  - Path: refresca el server component tree de las pages activas.
 *  - Tag: invalida el cache de unstable_cache, para que las queries
 *    cacheadas peguen DB la próxima vez. */
export function revalidateDomainPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/requests");
  revalidatePath("/procurement");
  revalidatePath("/reports");
  // updateTag (Next 16) invalida el unstable_cache con "read-your-own-
  // writes" — la siguiente lectura desde una Server Action ve los datos
  // frescos sin esperar al TTL.
  updateTag(CACHE_TAGS.inventory);
  updateTag(CACHE_TAGS.orders);
  updateTag(CACHE_TAGS.requests);
}
