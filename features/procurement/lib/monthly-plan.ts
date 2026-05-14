"use client";

import { statusFromStock, type Asset, type Status } from "@/lib/fake-data";
import { loadInventory } from "@/lib/storage";

import {
  loadOrders,
  saveOrders,
  type OrderLine,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "./orders";

/**
 * "Plan de compras del mes": una PO en estado draft, marcada con una
 * referencia especial PO-PLAN-YYYY-MM, que agrupa todo lo que el sistema
 * sugiere comprar este mes (items que cruzaron el umbral, pedidos sin stock).
 *
 * Reglas:
 *  - Hay UNO solo por mes (por usuario).
 *  - Cuando se "cierra" (pasa a ready/ordered), el del mes siguiente se crea
 *    automáticamente la próxima vez que se necesite.
 *  - Los items bajo umbral se agregan automáticamente, salvo que el usuario
 *    los haya excluido del plan (`dismissedItems` tracking).
 */

const KEY_DISMISSED = "invit:plan-dismissed:v1";
const KEY_SNAPSHOT = "invit:plan-snapshot:v1";

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

// ─── Dismissed items tracking ────────────────────────────────────────────

type DismissedRecord = Record<string, { dismissedAt: string }>;

export function loadDismissed(): Set<string> {
  if (!isBrowser()) return new Set();
  try {
    const raw = localStorage.getItem(KEY_DISMISSED);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as DismissedRecord;
    return new Set(Object.keys(parsed));
  } catch {
    return new Set();
  }
}

function loadDismissedRaw(): DismissedRecord {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(KEY_DISMISSED);
    return raw ? (JSON.parse(raw) as DismissedRecord) : {};
  } catch {
    return {};
  }
}

function saveDismissedRaw(rec: DismissedRecord) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY_DISMISSED, JSON.stringify(rec));
    window.dispatchEvent(new Event("invit:plan-dismissed-changed"));
  } catch {
    /* ignore */
  }
}

export function subscribeDismissed(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener("invit:plan-dismissed-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("invit:plan-dismissed-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

export function isDismissed(assetId: string): boolean {
  return loadDismissed().has(assetId);
}

export function markDismissed(assetId: string) {
  const rec = loadDismissedRaw();
  if (rec[assetId]) return;
  rec[assetId] = { dismissedAt: new Date().toISOString() };
  saveDismissedRaw(rec);
}

export function markUndismissed(assetId: string) {
  const rec = loadDismissedRaw();
  if (!rec[assetId]) return;
  delete rec[assetId];
  saveDismissedRaw(rec);
}

// ─── Snapshot del estado del inventario ──────────────────────────────────
// Trackeamos el último status visto por asset para detectar transiciones
// healthy → bajo umbral (esa es la señal de "alcanzó el mínimo").

type Snapshot = Record<string, Status>;

function loadSnapshot(): Snapshot {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(KEY_SNAPSHOT);
    return raw ? (JSON.parse(raw) as Snapshot) : {};
  } catch {
    return {};
  }
}

function saveSnapshot(s: Snapshot) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY_SNAPSHOT, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function clearSnapshot() {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(KEY_SNAPSHOT);
  } catch {
    /* ignore */
  }
}

// ─── Qty sugerida ────────────────────────────────────────────────────────

/**
 * Opción B: reposición con margen doble.
 * Se compra lo suficiente para llegar a (umbral × 2).
 * Si el stock supera (umbral × 2), no se sugiere comprar.
 */
export function suggestedQty(asset: Asset): number {
  const target = asset.threshold * 2;
  return Math.max(0, target - asset.stock);
}

// ─── Monthly plan helpers ────────────────────────────────────────────────

export function monthlyPlanReference(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `PO-PLAN-${y}-${m}`;
}

export function isMonthlyPlan(order: PurchaseOrder): boolean {
  return /^PO-PLAN-\d{4}-\d{2}$/.test(order.reference);
}

export function findMonthlyPlan(
  orders: PurchaseOrder[],
  date: Date = new Date(),
): PurchaseOrder | undefined {
  const ref = monthlyPlanReference(date);
  return orders.find((o) => o.reference === ref && o.status === "draft");
}

/**
 * Devuelve el plan del mes actual. Si no existe en estado draft, lo crea
 * y lo persiste. Solo devuelve la referencia + id, no fuerza re-cargas.
 */
export function getOrCreateMonthlyPlan(): PurchaseOrder {
  const orders = loadOrders();
  const existing = findMonthlyPlan(orders);
  if (existing) return existing;

  const now = new Date();
  const plan: PurchaseOrder = {
    id: `ord_plan_${now.getTime().toString(36)}`,
    reference: monthlyPlanReference(now),
    status: "draft",
    note: `Plan de compras de ${now.toLocaleDateString("es-AR", {
      month: "long",
      year: "numeric",
    })}`,
    lines: [],
    createdAt: now,
    updatedAt: now,
  };
  saveOrders([plan, ...orders]);
  return plan;
}

/**
 * Saca del plan los items auto-agregados cuyo asset volvió a tener stock
 * OK (healthy o low — solo critical/out justifican estar en el plan).
 * Items con id que NO empieza con "ln_plan_" se preservan (los puso el
 * usuario manualmente o vienen de pedidos).
 *
 * Devuelve el plan actualizado o undefined si no hubo cambios.
 */
function autoRemoveRecoveredItemsFromPlan(
  plan: PurchaseOrder,
  inventory: Asset[],
): PurchaseOrder | undefined {
  const byId = new Map(inventory.map((a) => [a.id, a]));
  const linesToKeep = plan.lines.filter((l) => {
    if (!l.assetId) return true; // ad-hoc, no se evalúa
    if (!l.id.startsWith("ln_plan_")) return true; // manual / desde pedido
    const asset = byId.get(l.assetId);
    if (!asset) return true; // asset eliminado del inventario, no tocamos
    return needsRestockSuggestion(asset); // mantener solo si sigue critical/out
  });

  if (linesToKeep.length === plan.lines.length) return undefined;

  const updated: PurchaseOrder = {
    ...plan,
    lines: linesToKeep,
    updatedAt: new Date(),
  };
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === plan.id);
  if (idx < 0) return undefined;
  const next = orders.slice();
  next[idx] = updated;
  saveOrders(next);
  return updated;
}

function lineFromAssetForPlan(asset: Asset): OrderLine {
  const qty = Math.max(1, suggestedQty(asset));
  return {
    id: `ln_plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    assetId: asset.id,
    name: asset.name,
    brand: asset.brand,
    category: asset.category,
    isNew: false,
    qty,
  };
}

export type ReconcileResult = {
  planId: string;
  planReference: string;
  added: number;
  isFirstRun: boolean;
};

// Recalcula el status real desde stock+threshold (defensivo contra datos
// stale guardados en localStorage).
function freshStatus(a: Asset): Status {
  return statusFromStock(a.stock, a.threshold);
}

/**
 * IDs de assets que ya están siendo comprados en alguna orden activa
 * (draft, ready, ordered, received_partial). Las "received" y "cancelled"
 * no cuentan — esas ya se cerraron o se descartaron.
 */
function getActiveOrderItemIds(): Set<string> {
  const orders = loadOrders();
  const ids = new Set<string>();
  for (const o of orders) {
    if (o.status === "received" || o.status === "cancelled") continue;
    for (const l of o.lines) {
      if (l.assetId) ids.add(l.assetId);
    }
  }
  return ids;
}

export type AssetInOrder = {
  orderId: string;
  reference: string;
  status: PurchaseOrderStatus;
  monthYear: string;
  qty: number;
};

/**
 * Si el asset está en alguna orden activa (draft / ready / ordered /
 * received_partial), devuelve metadata para mostrar al usuario qué orden
 * ya lo tiene reservado y en qué mes.
 *
 * `excludeOrderId` permite ignorar una orden específica — útil cuando se
 * está editando una orden y no querés que diga "ya pedido en esta misma
 * orden" para sus propios items.
 */
export function findActiveOrderForAsset(
  assetId: string,
  excludeOrderId?: string,
): AssetInOrder | undefined {
  const orders = loadOrders();
  const sorted = [...orders].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
  for (const o of sorted) {
    if (o.status === "received" || o.status === "cancelled") continue;
    if (excludeOrderId && o.id === excludeOrderId) continue;
    const line = o.lines.find((l) => l.assetId === assetId);
    if (!line) continue;
    const monthYear = o.createdAt
      .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
      .replace(/^./, (c) => c.toUpperCase());
    return {
      orderId: o.id,
      reference: o.reference,
      status: o.status,
      monthYear,
      qty: line.qty,
    };
  }
  return undefined;
}

// Item amerita aparecer como sugerencia cuando está bajo el umbral:
// low (con stock pero menor al mínimo), critical (muy bajo) u out (cero).
// El AUTO-add al plan solo se dispara en transiciones a critical/out,
// pero las sugerencias muestran todos los bajo umbral por si querés
// adelantarte y comprar antes de que se vuelva crítico.
function needsRestockSuggestion(a: Asset): boolean {
  const s = freshStatus(a);
  return s === "low" || s === "critical" || s === "out";
}

/**
 * Reconcilia el plan del mes detectando TRANSICIONES críticas: solo agrega
 * items que recién pasaron a stock crítico (≤40% del mínimo) o sin stock.
 * Items en estado "low" (tienen stock, solo bajaron del umbral) NO se
 * agregan automáticamente — pueden sumarse manualmente desde el modal de
 * Nueva orden si el usuario quiere.
 *
 * Primera corrida (sin snapshot previo): no agrega nada, solo registra el
 * estado actual como baseline. Así un inventario que arranca con muchos
 * items bajo umbral no inunda el plan.
 */
export function reconcileMonthlyPlan(): ReconcileResult {
  const inventory = loadInventory() ?? [];
  const dismissed = loadDismissed();
  const prevSnapshot = loadSnapshot();
  const isFirstRun = Object.keys(prevSnapshot).length === 0;

  // Snapshot nuevo = estado actual REAL del inventario (recomputado).
  const nextSnapshot: Snapshot = {};
  for (const asset of inventory) {
    nextSnapshot[asset.id] = freshStatus(asset);
  }
  saveSnapshot(nextSnapshot);

  if (isFirstRun) {
    const plan = getOrCreateMonthlyPlan();
    autoRemoveRecoveredItemsFromPlan(plan, inventory);
    return {
      planId: plan.id,
      planReference: plan.reference,
      added: 0,
      isFirstRun: true,
    };
  }

  // Detectar transiciones críticas: antes era OK (healthy o low),
  // ahora pasó a critical u out. Y que NO esté ya en otra orden activa.
  const beingPurchased = getActiveOrderItemIds();
  const transitioned: Asset[] = [];
  for (const asset of inventory) {
    const prev = prevSnapshot[asset.id];
    if (prev === undefined) continue; // item nuevo, no es transición
    const curr = freshStatus(asset);
    const wasOk = prev === "healthy" || prev === "low";
    const isNowCritical = curr === "critical" || curr === "out";
    if (!wasOk || !isNowCritical) continue;
    if (dismissed.has(asset.id)) continue; // excluido del auto-plan
    if (beingPurchased.has(asset.id)) continue; // ya está en otra orden
    transitioned.push(asset);
  }

  if (transitioned.length === 0) {
    const plan = getOrCreateMonthlyPlan();
    return {
      planId: plan.id,
      planReference: plan.reference,
      added: 0,
      isFirstRun: false,
    };
  }

  let plan = getOrCreateMonthlyPlan();
  // Limpiar primero items que ya recuperaron stock OK
  plan = autoRemoveRecoveredItemsFromPlan(plan, inventory) ?? plan;

  const inPlan = new Set(plan.lines.map((l) => l.assetId).filter(Boolean));
  const newLines: OrderLine[] = [];
  for (const asset of transitioned) {
    if (inPlan.has(asset.id)) continue; // ya estaba (caso raro)
    newLines.push(lineFromAssetForPlan(asset));
  }

  if (newLines.length === 0) {
    return {
      planId: plan.id,
      planReference: plan.reference,
      added: 0,
      isFirstRun: false,
    };
  }

  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === plan.id);
  const updatedPlan: PurchaseOrder = {
    ...plan,
    lines: [...plan.lines, ...newLines],
    updatedAt: new Date(),
  };
  const next = orders.slice();
  if (idx >= 0) next[idx] = updatedPlan;
  else next.unshift(updatedPlan);
  saveOrders(next);

  return {
    planId: plan.id,
    planReference: plan.reference,
    added: newLines.length,
    isFirstRun: false,
  };
}

/**
 * Lista items que necesitan reposición urgente y NO fueron dismissed.
 * Solo incluye CRITICAL u OUT — items "low" no se consideran sugerencia.
 *
 * Excluye items que YA están en cualquier orden activa (plan, drafts,
 * listas para enviar, enviadas, recibidas parciales). La intención es que
 * la card del plan en /procurement solo muestre cosas accionables —
 * pedidos en vuelo NO se muestran acá, se ven en /requests → Nuestras
 * compras.
 */
export function getPlanSuggestions(): Asset[] {
  const inventory = loadInventory() ?? [];
  const dismissed = loadDismissed();
  const beingPurchased = getActiveOrderItemIds();

  return inventory
    .filter((a) => {
      if (!needsRestockSuggestion(a)) return false;
      if (beingPurchased.has(a.id)) return false; // ya está en alguna orden activa
      if (dismissed.has(a.id)) return false;
      return true;
    })
    .sort((a, b) => {
      // Sin stock primero, después críticos
      const rank = (s: Status) =>
        s === "out" ? 0 : s === "critical" ? 1 : 2;
      return (
        rank(freshStatus(a)) - rank(freshStatus(b)) ||
        a.name.localeCompare(b.name)
      );
    });
}

/**
 * Agrega un asset al plan del mes manualmente (desde una sugerencia).
 * También lo "des-dismissea" para que futuras transiciones lo incluyan.
 */
export function addSuggestionToMonthlyPlan(assetId: string): boolean {
  const inventory = loadInventory() ?? [];
  const asset = inventory.find((a) => a.id === assetId);
  if (!asset) return false;

  markUndismissed(assetId);

  const plan = getOrCreateMonthlyPlan();
  if (plan.lines.some((l) => l.assetId === assetId)) return false;

  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === plan.id);
  const updatedPlan: PurchaseOrder = {
    ...plan,
    lines: [...plan.lines, lineFromAssetForPlan(asset)],
    updatedAt: new Date(),
  };
  const next = orders.slice();
  if (idx >= 0) next[idx] = updatedPlan;
  else next.unshift(updatedPlan);
  saveOrders(next);
  return true;
}

/**
 * Vacía el plan del mes (saca todos los items) y resetea el snapshot a
 * estado actual. Útil para empezar de cero cuando el plan acumuló items
 * que no querés.
 */
export function clearMonthlyPlan() {
  const plan = getOrCreateMonthlyPlan();
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === plan.id);
  if (idx < 0) return;
  const updatedPlan: PurchaseOrder = {
    ...plan,
    lines: [],
    updatedAt: new Date(),
  };
  const next = orders.slice();
  next[idx] = updatedPlan;
  saveOrders(next);

  // Reset snapshot al estado actual: cualquier item bajo umbral ahora
  // queda como baseline (no se va a auto-agregar). Recalcula status para
  // evitar staleness.
  const inventory = loadInventory() ?? [];
  const snapshot: Snapshot = {};
  for (const a of inventory) snapshot[a.id] = freshStatus(a);
  saveSnapshot(snapshot);
}

/**
 * Quita una línea del plan del mes Y marca el asset como dismissed para
 * que no se vuelva a agregar automáticamente.
 */
export function removeFromPlanAndDismiss(planId: string, lineId: string) {
  const orders = loadOrders();
  const idx = orders.findIndex((o) => o.id === planId);
  if (idx < 0) return;
  const plan = orders[idx];
  const line = plan.lines.find((l) => l.id === lineId);
  if (!line) return;

  const nextPlan: PurchaseOrder = {
    ...plan,
    lines: plan.lines.filter((l) => l.id !== lineId),
    updatedAt: new Date(),
  };
  const next = orders.slice();
  next[idx] = nextPlan;
  saveOrders(next);

  if (line.assetId) markDismissed(line.assetId);
}
