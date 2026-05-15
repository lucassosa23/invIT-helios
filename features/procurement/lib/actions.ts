"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/current-user";
import { statusFromStock } from "@/lib/fake-data";
import { prisma } from "@/lib/prisma";
import { statusToDb as assetStatusToDb } from "@/features/inventory/lib/mappers";

import { canTransition, type PurchaseOrderStatus } from "./orders";
import { statusToDb } from "./mappers";

// ============================================================
// Schemas
// ============================================================

const lineSchema = z.object({
  assetId: z.string().nullish(),
  name: z.string().min(1).max(200),
  brand: z.string().max(100).default(""),
  category: z.string().max(100).default("Otros"),
  isNew: z.boolean().default(false),
  qty: z.number().int().min(1),
});

const orderInputSchema = z.object({
  lines: z.array(lineSchema).min(1, "Agregá al menos un item"),
  note: z.string().max(500).default(""),
  status: z.enum([
    "draft",
    "ready",
    "ordered",
    "received_partial",
    "received",
    "cancelled",
  ]),
  monthYear: z.string().nullish(),
});

const shipmentSchema = z.object({
  lineId: z.string(),
  qty: z.number().int().min(1),
});

export type OrderInput = z.input<typeof orderInputSchema>;

// ============================================================
// Helpers
// ============================================================

function revalidateAll() {
  revalidatePath("/procurement");
  revalidatePath("/requests");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/reports");
}

async function nextOrderReference(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const last = await prisma.purchaseOrder.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });
  let next = 1;
  if (last) {
    const seq = parseInt(last.reference.slice(prefix.length), 10);
    if (!Number.isNaN(seq)) next = seq + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

function makeAssetSku(category: string, brand: string): string {
  const c = (category.slice(0, 3) || "NEW").toUpperCase();
  const b = (brand.slice(0, 3) || "GEN").toUpperCase();
  const rand = Math.random().toString(36).slice(-4).toUpperCase();
  return `${c}-${b}-${rand}`;
}

// ============================================================
// Mutations
// ============================================================

export async function createOrderAction(input: OrderInput): Promise<{ id: string; reference: string }> {
  await requireUser();
  const data = orderInputSchema.parse(input);

  const reference = await nextOrderReference();

  const order = await prisma.purchaseOrder.create({
    data: {
      reference,
      status: statusToDb(data.status),
      note: data.note.trim() || null,
      monthYear: data.monthYear ?? null,
      orderedAt: data.status === "ordered" ? new Date() : null,
      lines: {
        create: data.lines.map((l) => ({
          assetId: l.assetId || null,
          name: l.name.trim(),
          brand: l.brand.trim(),
          category: l.category.trim() || "Otros",
          isNew: l.isNew,
          qty: l.qty,
        })),
      },
    },
  });

  revalidateAll();
  return { id: order.id, reference: order.reference };
}

export async function updateOrderAction(
  id: string,
  input: OrderInput,
): Promise<void> {
  await requireUser();
  const data = orderInputSchema.parse(input);

  await prisma.$transaction([
    // El UI permite re-construir las líneas desde cero; reemplazamos todas.
    prisma.orderLine.deleteMany({ where: { orderId: id } }),
    prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: statusToDb(data.status),
        note: data.note.trim() || null,
        orderedAt: data.status === "ordered" ? new Date() : undefined,
        lines: {
          create: data.lines.map((l) => ({
            assetId: l.assetId || null,
            name: l.name.trim(),
            brand: l.brand.trim(),
            category: l.category.trim() || "Otros",
            isNew: l.isNew,
            qty: l.qty,
          })),
        },
      },
    }),
  ]);

  revalidateAll();
}

export async function transitionOrderStatusAction(
  id: string,
  next: PurchaseOrderStatus,
): Promise<void> {
  await requireUser();

  const current = await prisma.purchaseOrder.findUniqueOrThrow({
    where: { id },
    select: { status: true },
  });

  const currentApp = (
    {
      DRAFT: "draft",
      READY: "ready",
      ORDERED: "ordered",
      PARTIAL: "received_partial",
      RECEIVED: "received",
      CANCELLED: "cancelled",
    } as const
  )[current.status];

  if (!canTransition(currentApp, next)) {
    throw new Error(`Transición inválida: ${currentApp} → ${next}`);
  }
  // received y received_partial vienen siempre del flow de recepción.
  if (next === "received" || next === "received_partial") {
    throw new Error("Usá receiveOrderShipmentAction para marcar recibida.");
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: {
      status: statusToDb(next),
      orderedAt: next === "ordered" ? new Date() : undefined,
    },
  });

  revalidateAll();
}

export async function deleteOrderAction(id: string): Promise<void> {
  await requireUser();
  // OrderLine.onDelete = Cascade en el schema → se borran las líneas solas.
  await prisma.purchaseOrder.delete({ where: { id } });
  revalidateAll();
}

// ============================================================
// Recepción de orden — pieza crítica
// ============================================================

export type ShipmentInput = z.input<typeof shipmentSchema>;

export type ReceiveResult =
  | {
      ok: true;
      updated: number;
      created: number;
      totalAdded: number;
      newStatus: PurchaseOrderStatus;
    }
  | { ok: false; reason: string };

/** Aplica una entrega (parcial o completa) al inventario:
 *   - Por cada línea con qty > 0, suma stock al asset existente o crea
 *     un asset nuevo si la línea es isNew y aún no tenía assetId.
 *   - Genera un Movement por cada línea (type RECEIVE, sourceKind
 *     ORDER_RECEIVE) para trazabilidad.
 *   - Recalcula el status final: si todas las líneas quedaron cubiertas
 *     → RECEIVED. Si parcial → PARTIAL.
 *   - Todo en transacción: si algo falla, nada se aplica. */
export async function receiveOrderShipmentAction(
  orderId: string,
  shipments: ShipmentInput[],
): Promise<ReceiveResult> {
  const user = await requireUser();
  const parsed = shipments.map((s) => shipmentSchema.parse(s));
  if (parsed.length === 0) {
    return { ok: false, reason: "No marcaste cantidades para recibir." };
  }

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });
    if (!order) return { ok: false as const, reason: "Orden no encontrada." };
    if (order.status !== "ORDERED" && order.status !== "PARTIAL") {
      return {
        ok: false as const,
        reason: "Solo se reciben órdenes en estado Enviada o parcial.",
      };
    }

    const shipmentByLine = new Map(parsed.map((s) => [s.lineId, s.qty]));
    let updated = 0;
    let created = 0;
    let totalAdded = 0;
    const now = new Date();

    // Tomamos un location/vendor por default desde el primer asset si
    // hay que crear uno nuevo (asset isNew sin assetId).
    const defaultLocation = await tx.asset.findFirst({
      select: { locationId: true },
      where: { locationId: { not: null } },
    });
    const defaultLocationId = defaultLocation?.locationId ?? null;

    for (const line of order.lines) {
      const incoming = shipmentByLine.get(line.id) ?? 0;
      if (incoming <= 0) continue;

      let assetId = line.assetId;
      let prevStock = 0;
      let nextStock = 0;
      let assetThreshold = Math.max(1, Math.ceil(line.qty * 0.3));

      if (assetId) {
        const asset = await tx.asset.findUnique({
          where: { id: assetId },
          select: { stock: true, threshold: true },
        });
        if (!asset) {
          // El asset fue borrado entre el draft y la recepción. Skip.
          continue;
        }
        prevStock = asset.stock;
        nextStock = asset.stock + incoming;
        assetThreshold = asset.threshold;
        await tx.asset.update({
          where: { id: assetId },
          data: {
            stock: nextStock,
            status: assetStatusToDb(statusFromStock(nextStock, asset.threshold)),
            updatedAt: now,
          },
        });
        updated++;
      } else {
        // Primera entrega de una línea isNew → creamos el asset.
        const newAsset = await tx.asset.create({
          data: {
            sku: makeAssetSku(line.category, line.brand),
            name: line.name,
            brand: line.brand,
            category: line.category || "Otros",
            stock: incoming,
            threshold: assetThreshold,
            locationId: defaultLocationId,
            status: assetStatusToDb(
              statusFromStock(incoming, assetThreshold),
            ),
          },
          select: { id: true },
        });
        assetId = newAsset.id;
        await tx.orderLine.update({
          where: { id: line.id },
          data: { assetId },
        });
        prevStock = 0;
        nextStock = incoming;
        created++;
      }

      // Movement para trazabilidad
      await tx.movement.create({
        data: {
          assetId,
          type: "RECEIVE",
          qty: incoming,
          delta: incoming,
          sourceKind: "ORDER_RECEIVE",
          sourceRef: order.id,
          actorId: user.id,
          note: `Recepción ${order.reference}`,
          prevStock,
          nextStock,
        },
      });

      // Suma al receivedQty acumulado de la línea
      await tx.orderLine.update({
        where: { id: line.id },
        data: { receivedQty: (line.receivedQty ?? 0) + incoming },
      });

      totalAdded += incoming;
    }

    // Recalcular status de la orden
    const refreshedLines = await tx.orderLine.findMany({
      where: { orderId: order.id },
    });
    const allCovered = refreshedLines.every(
      (l) => (l.receivedQty ?? 0) >= l.qty,
    );
    const newStatusDb = allCovered ? "RECEIVED" : "PARTIAL";

    await tx.purchaseOrder.update({
      where: { id: order.id },
      data: {
        status: newStatusDb,
        receivedAt: allCovered ? now : undefined,
        updatedAt: now,
      },
    });

    const finalStatus: PurchaseOrderStatus = allCovered
      ? "received"
      : "received_partial";
    return {
      ok: true as const,
      updated,
      created,
      totalAdded,
      newStatus: finalStatus,
    };
  });

  if (result.ok) revalidateAll();
  return result;
}
