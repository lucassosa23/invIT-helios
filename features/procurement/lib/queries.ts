import "server-only";

import { monthYearString } from "@/lib/helpers";
import { prisma } from "@/lib/prisma";

import { orderFromDb } from "./mappers";
import type { PurchaseOrder } from "./orders";

export async function getOrders(): Promise<PurchaseOrder[]> {
  const rows = await prisma.purchaseOrder.findMany({
    include: { lines: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(orderFromDb);
}

export async function getOrderById(
  id: string,
): Promise<PurchaseOrder | null> {
  const row = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { lines: true },
  });
  return row ? orderFromDb(row) : null;
}

/** Plan de compras DRAFT del mes corriente, si existe. No lo crea (eso se
 *  hace lazy desde las server actions cuando se agrega algo). Busca por
 *  `monthYear` o por la reference canónica (rescata órdenes legacy sin
 *  monthYear seteado). */
export async function getCurrentMonthlyPlan(): Promise<PurchaseOrder | null> {
  const monthYear = monthYearString();
  const row = await prisma.purchaseOrder.findFirst({
    where: {
      status: "DRAFT",
      OR: [{ monthYear }, { reference: `PO-PLAN-${monthYear}` }],
    },
    include: { lines: true },
  });
  return row ? orderFromDb(row) : null;
}

export type PlanSuggestion = {
  id: string;
  name: string;
  brand: string;
  category: string;
  stock: number;
  threshold: number;
  status: "low" | "critical" | "out";
};

/** Items que ameritan ser sumados al plan: stock LOW/CRITICAL/OUT, no
 *  dismissed y NO presentes en otra orden activa. */
export async function getPlanSuggestions(): Promise<PlanSuggestion[]> {
  const candidates = await prisma.asset.findMany({
    where: {
      status: { in: ["LOW", "CRITICAL", "OUT"] },
      dismissedFromAutoPlan: false,
    },
  });
  if (candidates.length === 0) return [];

  const activeLines = await prisma.orderLine.findMany({
    where: {
      order: { status: { in: ["DRAFT", "READY", "ORDERED", "PARTIAL"] } },
      assetId: { in: candidates.map((c) => c.id) },
    },
    select: { assetId: true },
  });
  const inActive = new Set(
    activeLines.map((l) => l.assetId).filter(Boolean) as string[],
  );

  return candidates
    .filter((c) => !inActive.has(c.id))
    .map<PlanSuggestion>((a) => ({
      id: a.id,
      name: a.name,
      brand: a.brand,
      category: a.category,
      stock: a.stock,
      threshold: a.threshold,
      status: a.status.toLowerCase() as PlanSuggestion["status"],
    }))
    .sort((x, y) => {
      const rank = (s: PlanSuggestion["status"]) =>
        s === "out" ? 0 : s === "critical" ? 1 : 2;
      return rank(x.status) - rank(y.status) || x.name.localeCompare(y.name);
    });
}
