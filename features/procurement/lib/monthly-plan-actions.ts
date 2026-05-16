"use server";

import { requireUser } from "@/lib/auth/current-user";
import {
  monthYearString,
  parseId,
  revalidateDomainPaths,
} from "@/lib/helpers";
import { prisma } from "@/lib/prisma";

function monthlyPlanNote(d: Date = new Date()): string {
  const monthYear = d
    .toLocaleDateString("es-AR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
  return `Plan de compras de ${monthYear}`;
}

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Encuentra o crea el plan DRAFT del mes corriente.
 *  - Busca por `monthYear` (lo seteamos en órdenes nuevas).
 *  - Si no hay match, busca por la reference canónica `PO-PLAN-YYYY-MM`
 *    (rescata órdenes viejas del legacy sin monthYear) y le setea el
 *    monthYear al vuelo.
 *  - Si tampoco existe, crea uno nuevo. Si la reference canónica ya
 *    pertenece a una orden terminal (cancelled/received), agrega sufijo
 *    `-vN` para no chocar con el unique. */
async function findOrCreateMonthlyPlan(
  client: typeof prisma | PrismaTx = prisma,
) {
  const monthYear = monthYearString();
  const canonicalRef = `PO-PLAN-${monthYear}`;

  const reusable = await client.purchaseOrder.findFirst({
    where: {
      status: "DRAFT",
      OR: [{ monthYear }, { reference: canonicalRef }],
    },
  });
  if (reusable) {
    if (!reusable.monthYear) {
      return await client.purchaseOrder.update({
        where: { id: reusable.id },
        data: { monthYear },
      });
    }
    return reusable;
  }

  const now = new Date();
  const collision = await client.purchaseOrder.findUnique({
    where: { reference: canonicalRef },
    select: { id: true },
  });
  let reference = canonicalRef;
  if (collision) {
    const sameMonth = await client.purchaseOrder.findMany({
      where: { reference: { startsWith: `${canonicalRef}-v` } },
      select: { reference: true },
    });
    let max = 1;
    for (const o of sameMonth) {
      const m = o.reference.match(/-v(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    reference = `${canonicalRef}-v${max + 1}`;
  }

  return await client.purchaseOrder.create({
    data: {
      reference,
      monthYear,
      status: "DRAFT",
      note: monthlyPlanNote(now),
    },
  });
}

async function getOrCreateMonthlyPlanRow() {
  return await findOrCreateMonthlyPlan();
}

export async function getOrCreateMonthlyPlanAction(): Promise<{
  id: string;
  reference: string;
}> {
  await requireUser();
  const plan = await getOrCreateMonthlyPlanRow();
  return { id: plan.id, reference: plan.reference };
}

function suggestedQty(stock: number, threshold: number): number {
  return Math.max(1, threshold * 2 - stock);
}

export async function addSuggestionToMonthlyPlanAction(
  assetId: string,
): Promise<{ added: boolean; orderId: string; orderReference: string }> {
  await requireUser();
  const safeAssetId = parseId(assetId, "assetId");

  const result = await prisma.$transaction(async (tx) => {
    const asset = await tx.asset.findUnique({
      where: { id: safeAssetId },
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        stock: true,
        threshold: true,
      },
    });
    if (!asset) throw new Error("Item no encontrado.");

    await tx.asset.update({
      where: { id: safeAssetId },
      data: { dismissedFromAutoPlan: false },
    });

    const plan = await findOrCreateMonthlyPlan(tx);

    const existingLine = await tx.orderLine.findFirst({
      where: { orderId: plan.id, assetId: safeAssetId },
    });
    if (existingLine) {
      return {
        added: false,
        orderId: plan.id,
        orderReference: plan.reference,
      };
    }

    await tx.orderLine.create({
      data: {
        orderId: plan.id,
        assetId: safeAssetId,
        name: asset.name,
        brand: asset.brand,
        category: asset.category,
        isNew: false,
        qty: suggestedQty(asset.stock, asset.threshold),
      },
    });

    await tx.purchaseOrder.update({
      where: { id: plan.id },
      data: { updatedAt: new Date() },
    });

    return {
      added: true,
      orderId: plan.id,
      orderReference: plan.reference,
    };
  });

  if (result.added) revalidateDomainPaths();
  return result;
}

export async function clearMonthlyPlanAction(): Promise<{ removed: number }> {
  await requireUser();
  const monthYear = monthYearString();
  const plan = await prisma.purchaseOrder.findFirst({
    where: {
      status: "DRAFT",
      OR: [{ monthYear }, { reference: `PO-PLAN-${monthYear}` }],
    },
  });
  if (!plan) return { removed: 0 };
  const res = await prisma.orderLine.deleteMany({
    where: { orderId: plan.id },
  });
  if (res.count > 0) {
    await prisma.purchaseOrder.update({
      where: { id: plan.id },
      data: { updatedAt: new Date() },
    });
    revalidateDomainPaths();
  }
  return { removed: res.count };
}

export async function removeLineAndDismissAction(
  planId: string,
  lineId: string,
): Promise<void> {
  await requireUser();
  const safePlanId = parseId(planId, "planId");
  const safeLineId = parseId(lineId, "lineId");
  await prisma.$transaction(async (tx) => {
    const line = await tx.orderLine.findUnique({
      where: { id: safeLineId },
      select: { assetId: true, orderId: true },
    });
    if (!line || line.orderId !== safePlanId) return;
    await tx.orderLine.delete({ where: { id: safeLineId } });
    if (line.assetId) {
      await tx.asset.update({
        where: { id: line.assetId },
        data: { dismissedFromAutoPlan: true },
      });
    }
    await tx.purchaseOrder.update({
      where: { id: safePlanId },
      data: { updatedAt: new Date() },
    });
  });
  revalidateDomainPaths();
}

/** Aprueba un pedido sin stock: lo suma al plan del mes (creando línea o
 *  acumulando qty en una línea existente) y marca el request como
 *  AWAITING_PURCHASE vinculado al plan. Todo transaccional. */
export async function approveRequestToPurchaseAction(
  requestId: string,
): Promise<{ orderId: string; orderReference: string }> {
  await requireUser();
  const safeRequestId = parseId(requestId, "requestId");

  const result = await prisma.$transaction(async (tx) => {
    const req = await tx.internalRequest.findUnique({
      where: { id: safeRequestId },
    });
    if (!req) throw new Error("Pedido no encontrado.");
    if (req.status !== "PENDING") {
      throw new Error("Solo se aprueba un pedido pendiente.");
    }

    const plan = await findOrCreateMonthlyPlan(tx);

    let existingLine = null;
    if (req.assetId) {
      existingLine = await tx.orderLine.findFirst({
        where: { orderId: plan.id, assetId: req.assetId },
      });
    } else {
      existingLine = await tx.orderLine.findFirst({
        where: {
          orderId: plan.id,
          assetId: null,
          isNew: true,
          name: { equals: req.itemName, mode: "insensitive" },
          brand: { equals: req.brand, mode: "insensitive" },
        },
      });
    }

    if (existingLine) {
      await tx.orderLine.update({
        where: { id: existingLine.id },
        data: { qty: existingLine.qty + req.qty },
      });
    } else {
      await tx.orderLine.create({
        data: {
          orderId: plan.id,
          assetId: req.assetId,
          name: req.itemName,
          brand: req.brand,
          category: req.category,
          isNew: !req.assetId,
          qty: req.qty,
        },
      });
    }

    await tx.purchaseOrder.update({
      where: { id: plan.id },
      data: { updatedAt: new Date() },
    });

    await tx.internalRequest.update({
      where: { id: safeRequestId },
      data: {
        status: "AWAITING_PURCHASE",
        linkedOrderId: plan.id,
        approvedAt: req.approvedAt ?? new Date(),
      },
    });

    return { orderId: plan.id, orderReference: plan.reference };
  });

  revalidateDomainPaths();
  return result;
}

export type PlanSuggestion = {
  id: string;
  name: string;
  brand: string;
  category: string;
  stock: number;
  threshold: number;
  status: "low" | "critical" | "out";
  inActiveOrder?: {
    orderId: string;
    reference: string;
    status: string;
    monthYear: string;
    qty: number;
  };
};

const ACTIVE_ORDER_STATUSES = ["DRAFT", "READY", "ORDERED", "PARTIAL"] as const;

export async function getPlanSuggestionsAction(): Promise<PlanSuggestion[]> {
  await requireUser();

  const candidates = await prisma.asset.findMany({
    where: {
      status: { in: ["LOW", "CRITICAL", "OUT"] },
      dismissedFromAutoPlan: false,
    },
  });

  if (candidates.length === 0) return [];

  const activeLines = await prisma.orderLine.findMany({
    where: {
      order: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
      assetId: { in: candidates.map((c) => c.id) },
    },
    include: {
      order: {
        select: {
          id: true,
          reference: true,
          status: true,
          monthYear: true,
          createdAt: true,
        },
      },
    },
  });

  const byAssetId = new Map<string, (typeof activeLines)[number]>();
  // Quedarnos con la más reciente por asset
  for (const l of activeLines) {
    if (!l.assetId) continue;
    const prev = byAssetId.get(l.assetId);
    if (!prev || prev.order.createdAt < l.order.createdAt) {
      byAssetId.set(l.assetId, l);
    }
  }

  // Solo mostramos como sugerencias los que NO están en una orden activa.
  const suggestions = candidates
    .filter((c) => !byAssetId.has(c.id))
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

  return suggestions;
}

export type ReconcileResult = {
  added: number;
  isFirstRun: boolean;
  nextSnapshot: Record<string, string>;
};

/** Detecta items que transicionaron desde OK (healthy/low) a CRITICAL/OUT
 *  desde el último snapshot (que vive en localStorage del browser) y los
 *  agrega al plan del mes. */
export async function reconcileMonthlyPlanAction(
  snapshot: Record<string, string>,
): Promise<ReconcileResult> {
  await requireUser();

  const assets = await prisma.asset.findMany({
    select: {
      id: true,
      name: true,
      brand: true,
      category: true,
      stock: true,
      threshold: true,
      status: true,
      dismissedFromAutoPlan: true,
    },
  });

  const nextSnapshot: Record<string, string> = {};
  for (const a of assets) nextSnapshot[a.id] = a.status.toLowerCase();

  const isFirstRun = Object.keys(snapshot).length === 0;
  if (isFirstRun) {
    return { added: 0, isFirstRun: true, nextSnapshot };
  }

  const transitioned = assets.filter((a) => {
    if (a.dismissedFromAutoPlan) return false;
    const prev = snapshot[a.id];
    if (!prev) return false;
    const wasOk = prev === "healthy" || prev === "low";
    const isCritical = a.status === "CRITICAL" || a.status === "OUT";
    return wasOk && isCritical;
  });

  if (transitioned.length === 0) {
    return { added: 0, isFirstRun: false, nextSnapshot };
  }

  // Excluir los que ya están en alguna orden activa
  const activeLines = await prisma.orderLine.findMany({
    where: {
      order: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
      assetId: { in: transitioned.map((a) => a.id) },
    },
    select: { assetId: true },
  });
  const alreadyInActive = new Set(
    activeLines.map((l) => l.assetId).filter(Boolean) as string[],
  );

  const toAdd = transitioned.filter((a) => !alreadyInActive.has(a.id));
  if (toAdd.length === 0) {
    return { added: 0, isFirstRun: false, nextSnapshot };
  }

  let added = 0;
  await prisma.$transaction(async (tx) => {
    const plan = await findOrCreateMonthlyPlan(tx);

    for (const a of toAdd) {
      const existing = await tx.orderLine.findFirst({
        where: { orderId: plan.id, assetId: a.id },
      });
      if (existing) continue;
      await tx.orderLine.create({
        data: {
          orderId: plan.id,
          assetId: a.id,
          name: a.name,
          brand: a.brand,
          category: a.category,
          isNew: false,
          qty: suggestedQty(a.stock, a.threshold),
        },
      });
      added++;
    }

    if (added > 0) {
      await tx.purchaseOrder.update({
        where: { id: plan.id },
        data: { updatedAt: new Date() },
      });
    }
  });

  if (added > 0) revalidateDomainPaths();
  return { added, isFirstRun: false, nextSnapshot };
}
