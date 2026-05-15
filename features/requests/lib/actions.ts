"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/current-user";
import { statusFromStock } from "@/lib/fake-data";
import { prisma } from "@/lib/prisma";
import { statusToDb as assetStatusToDb } from "@/features/inventory/lib/mappers";

import { priorityToDb, requestStatusToDb } from "./mappers";

// ============================================================
// Schemas
// ============================================================

const requestInputSchema = z.object({
  requesterName: z.string().min(1).max(200),
  requesterTeam: z.string().max(100).default(""),
  itemName: z.string().min(1).max(200),
  assetId: z.string().nullish(),
  brand: z.string().max(100).default(""),
  category: z.string().min(1).max(100),
  qty: z.number().int().min(1),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  reason: z.string().max(500).default(""),
});

export type RequestInput = z.input<typeof requestInputSchema>;

// ============================================================
// Helpers
// ============================================================

function revalidateAll() {
  revalidatePath("/requests");
  revalidatePath("/procurement");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  revalidatePath("/reports");
}

async function nextRequestReference(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `REQ-${year}-`;
  const last = await prisma.internalRequest.findFirst({
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

// ============================================================
// CRUD
// ============================================================

export async function createRequestAction(
  input: RequestInput,
): Promise<{ id: string; reference: string }> {
  await requireUser();
  const data = requestInputSchema.parse(input);

  const reference = await nextRequestReference();

  const req = await prisma.internalRequest.create({
    data: {
      reference,
      requesterName: data.requesterName.trim(),
      requesterTeam: data.requesterTeam.trim(),
      itemName: data.itemName.trim(),
      assetId: data.assetId || null,
      brand: data.brand.trim(),
      category: data.category.trim() || "Otros",
      qty: data.qty,
      priority: priorityToDb(data.priority),
      reason: data.reason.trim(),
      status: "PENDING",
    },
  });

  revalidateAll();
  return { id: req.id, reference: req.reference };
}

export async function updateRequestAction(
  id: string,
  input: RequestInput,
): Promise<void> {
  await requireUser();
  const data = requestInputSchema.parse(input);

  await prisma.internalRequest.update({
    where: { id },
    data: {
      requesterName: data.requesterName.trim(),
      requesterTeam: data.requesterTeam.trim(),
      itemName: data.itemName.trim(),
      assetId: data.assetId || null,
      brand: data.brand.trim(),
      category: data.category.trim() || "Otros",
      qty: data.qty,
      priority: priorityToDb(data.priority),
      reason: data.reason.trim(),
    },
  });

  revalidateAll();
}

export async function deleteRequestAction(id: string): Promise<void> {
  await requireUser();
  await prisma.internalRequest.delete({ where: { id } });
  revalidateAll();
}

// ============================================================
// Vinculación con asset existente (asset picker)
// ============================================================

export async function linkRequestAssetAction(
  requestId: string,
  assetId: string,
): Promise<void> {
  await requireUser();
  const asset = await prisma.asset.findUniqueOrThrow({
    where: { id: assetId },
    select: { name: true, brand: true, category: true },
  });

  await prisma.internalRequest.update({
    where: { id: requestId },
    data: {
      assetId,
      itemName: asset.name,
      brand: asset.brand,
      category: asset.category,
    },
  });

  revalidateAll();
}

// ============================================================
// Transiciones de estado
// ============================================================

export async function markRequestReadyAction(id: string): Promise<void> {
  await requireUser();
  await prisma.internalRequest.update({
    where: { id },
    data: { status: "READY_TO_DELIVER" },
  });
  revalidateAll();
}

export async function rejectRequestAction(
  id: string,
  reason?: string,
): Promise<void> {
  await requireUser();
  await prisma.internalRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason: reason?.trim() || null,
    },
  });
  revalidateAll();
}

/** Entrega un request ready_to_deliver: descuenta stock, marca delivered,
 *  deja un Movement OUT. Todo en transacción. */
export async function deliverRequestAction(
  id: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const user = await requireUser();

  return await prisma.$transaction(async (tx) => {
    const req = await tx.internalRequest.findUnique({ where: { id } });
    if (!req) return { ok: false as const, reason: "Pedido no encontrado." };
    if (req.status !== "READY_TO_DELIVER") {
      return {
        ok: false as const,
        reason: "El pedido tiene que estar listo para entregar.",
      };
    }
    if (!req.assetId) {
      return {
        ok: false as const,
        reason: "El pedido no está vinculado a un item del inventario.",
      };
    }

    const asset = await tx.asset.findUnique({
      where: { id: req.assetId },
      select: { stock: true, threshold: true },
    });
    if (!asset) {
      return { ok: false as const, reason: "El item ya no existe." };
    }
    if (asset.stock < req.qty) {
      return {
        ok: false as const,
        reason: `Stock insuficiente (${asset.stock}/${req.qty}).`,
      };
    }

    const nextStock = asset.stock - req.qty;
    const now = new Date();

    await tx.asset.update({
      where: { id: req.assetId },
      data: {
        stock: nextStock,
        status: assetStatusToDb(statusFromStock(nextStock, asset.threshold)),
        updatedAt: now,
      },
    });

    await tx.movement.create({
      data: {
        assetId: req.assetId,
        type: "OUT",
        qty: req.qty,
        delta: -req.qty,
        sourceKind: "REQUEST_DELIVER",
        sourceRef: req.id,
        actorId: user.id,
        note: `Entrega ${req.reference} · ${req.requesterName}`,
        prevStock: asset.stock,
        nextStock,
      },
    });

    await tx.internalRequest.update({
      where: { id },
      data: { status: "DELIVERED", deliveredAt: now },
    });

    return { ok: true as const };
  }).then((result) => {
    if (result.ok) revalidateAll();
    return result;
  });
}

// ============================================================
// Vinculación masiva con una orden (desde new-order-dialog)
// ============================================================

/** Sincroniza qué requests están vinculados a una orden.
 *  - Requests en `requestIds` que no estaban → pasan a awaiting_purchase con linkedOrderId.
 *  - Requests que estaban vinculados pero ya no están en la lista → vuelven a pending sin linkedOrderId. */
export async function syncOrderRequestLinksAction(
  orderId: string,
  requestIds: string[],
): Promise<{ linked: number; unlinked: number }> {
  await requireUser();
  const idsSet = new Set(requestIds);

  return await prisma.$transaction(async (tx) => {
    // Los que ya están vinculados a esta orden
    const currentlyLinked = await tx.internalRequest.findMany({
      where: { linkedOrderId: orderId },
      select: { id: true, status: true },
    });
    const currentlyLinkedIds = new Set(currentlyLinked.map((r) => r.id));

    // A linkear: ids nuevos en la lista
    const toLink = requestIds.filter((id) => !currentlyLinkedIds.has(id));
    // A desvincular: ids que estaban pero ya no están
    const toUnlink = currentlyLinked
      .filter((r) => !idsSet.has(r.id))
      .map((r) => r.id);

    let linked = 0;
    let unlinked = 0;

    if (toLink.length > 0) {
      const res = await tx.internalRequest.updateMany({
        where: { id: { in: toLink } },
        data: {
          linkedOrderId: orderId,
          status: "AWAITING_PURCHASE",
          approvedAt: new Date(),
        },
      });
      linked = res.count;
    }
    if (toUnlink.length > 0) {
      const res = await tx.internalRequest.updateMany({
        where: { id: { in: toUnlink } },
        data: {
          linkedOrderId: null,
          status: "PENDING",
          approvedAt: null,
        },
      });
      unlinked = res.count;
    }

    return { linked, unlinked };
  }).then((result) => {
    revalidateAll();
    return result;
  });
}

// ============================================================
// Reconciliación post-recepción
// ============================================================

/** Llamado automáticamente desde la recepción de orden:
 *  los requests awaiting_purchase cuyo stock ahora alcanza pasan a
 *  ready_to_deliver. Si el request no tiene assetId (adhoc), intenta
 *  matchearlo por nombre+marca contra el inventario.
 *
 *  Devuelve cuántos se flippearon. */
export async function reconcileAwaitingRequestsAction(): Promise<number> {
  await requireUser();

  const awaiting = await prisma.internalRequest.findMany({
    where: { status: "AWAITING_PURCHASE" },
  });
  if (awaiting.length === 0) return 0;

  let flipped = 0;
  for (const req of awaiting) {
    let assetId = req.assetId;
    let asset = assetId
      ? await prisma.asset.findUnique({
          where: { id: assetId },
          select: { stock: true },
        })
      : null;

    // Adhoc: intentar match por nombre + marca
    if (!asset) {
      const match = await prisma.asset.findFirst({
        where: {
          name: { equals: req.itemName, mode: "insensitive" },
          brand: { equals: req.brand, mode: "insensitive" },
        },
        select: { id: true, stock: true },
      });
      if (match) {
        assetId = match.id;
        asset = { stock: match.stock };
      }
    }

    if (!asset || asset.stock < req.qty) continue;

    await prisma.internalRequest.update({
      where: { id: req.id },
      data: {
        status: "READY_TO_DELIVER",
        assetId: assetId ?? undefined,
      },
    });
    flipped++;
  }

  if (flipped > 0) revalidateAll();
  return flipped;
}

/** Al cancelar una orden, los requests vinculados vuelven a pending. */
export async function cascadeRequestsOnOrderCancelledAction(
  orderId: string,
): Promise<number> {
  await requireUser();
  const res = await prisma.internalRequest.updateMany({
    where: { linkedOrderId: orderId, status: "AWAITING_PURCHASE" },
    data: { linkedOrderId: null, status: "PENDING", approvedAt: null },
  });
  if (res.count > 0) revalidateAll();
  return res.count;
}
