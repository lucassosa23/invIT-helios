"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth/current-user";
import { statusFromStock } from "@/lib/fake-data";
import {
  idSchema,
  makeSku,
  parseId,
  revalidateDomainPaths,
} from "@/lib/helpers";
import { prisma } from "@/lib/prisma";
import { statusToDb as assetStatusToDb } from "@/features/inventory/lib/mappers";

import { kindToDb } from "./mappers";
import { normalizeBarcode } from "./scan";

// ============================================================
// Schemas
// ============================================================

const createSessionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["in", "out"]),
});

const adhocAssetSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brand: z.string().trim().max(100).default(""),
  category: z.string().trim().min(1).max(100),
  threshold: z.number().int().min(1).default(5),
});

const barcodeSchema = z
  .string()
  .trim()
  .min(2, "Código demasiado corto")
  .max(64, "Código demasiado largo");

export type CreateSessionInput = z.input<typeof createSessionSchema>;
export type AdhocAssetInput = z.input<typeof adhocAssetSchema>;

// ============================================================
// Mutations
// ============================================================

export async function createScanSessionAction(
  input: CreateSessionInput,
): Promise<{ id: string }> {
  const user = await requireUser();
  const data = createSessionSchema.parse(input);

  const created = await prisma.scanSession.create({
    data: {
      name: data.name,
      kind: kindToDb(data.kind),
      status: "OPEN",
      actorId: user.id,
    },
    select: { id: true },
  });

  return created;
}

/** Procesa un código escaneado: si matchea un asset, suma 1 a la línea;
 *  si no, incrementa el contador del "desconocido" para ese código. */
export async function appendScanAction(
  sessionId: string,
  rawBarcode: string,
): Promise<
  | {
      ok: true;
      kind: "matched";
      assetName: string;
      qty: number;
    }
  | {
      ok: true;
      kind: "unknown";
      barcode: string;
      count: number;
    }
  | { ok: false; reason: string }
> {
  await requireUser();
  const safeSessionId = parseId(sessionId, "sessionId");
  const parsed = barcodeSchema.safeParse(rawBarcode);
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues[0]?.message ?? "Código inválido." };
  }
  const barcode = normalizeBarcode(parsed.data);

  return await prisma.$transaction(async (tx) => {
    const session = await tx.scanSession.findUnique({
      where: { id: safeSessionId },
      select: { status: true },
    });
    if (!session) {
      return { ok: false as const, reason: "Sesión no encontrada." };
    }
    if (session.status !== "OPEN") {
      return {
        ok: false as const,
        reason: "La sesión está cerrada.",
      };
    }

    const asset = await tx.asset.findUnique({
      where: { barcode },
      select: { id: true, name: true },
    });

    if (asset) {
      const line = await tx.scanLine.upsert({
        where: {
          sessionId_assetId: { sessionId: safeSessionId, assetId: asset.id },
        },
        create: {
          sessionId: safeSessionId,
          assetId: asset.id,
          barcode,
          qty: 1,
          lastScanAt: new Date(),
        },
        update: {
          qty: { increment: 1 },
          barcode,
          lastScanAt: new Date(),
        },
        select: { qty: true },
      });
      return {
        ok: true as const,
        kind: "matched" as const,
        assetName: asset.name,
        qty: line.qty,
      };
    }

    const unk = await tx.unknownScan.upsert({
      where: {
        sessionId_barcode: { sessionId: safeSessionId, barcode },
      },
      create: {
        sessionId: safeSessionId,
        barcode,
        count: 1,
        firstScanAt: new Date(),
      },
      update: { count: { increment: 1 } },
      select: { count: true },
    });
    return {
      ok: true as const,
      kind: "unknown" as const,
      barcode,
      count: unk.count,
    };
  });
}

export async function updateScanLineQtyAction(
  lineId: string,
  qty: number,
): Promise<void> {
  await requireUser();
  const safeId = parseId(lineId, "lineId");
  const safeQty = z.number().int().min(1).max(100_000).parse(qty);
  await prisma.scanLine.update({
    where: { id: safeId },
    data: { qty: safeQty },
  });
}

export async function removeScanLineAction(lineId: string): Promise<void> {
  await requireUser();
  const safeId = parseId(lineId, "lineId");
  await prisma.scanLine.delete({ where: { id: safeId } });
}

/** Vincula un desconocido a un asset ya existente. Setea el barcode al
 *  asset (si no tenía), convierte el conteo en qty de ScanLine y marca
 *  el unknown como resolved. Todo transaccional. */
export async function resolveUnknownLinkAction(
  unknownId: string,
  assetId: string,
): Promise<void> {
  await requireUser();
  const safeUnknownId = parseId(unknownId, "unknownId");
  const safeAssetId = parseId(assetId, "assetId");

  await prisma.$transaction(async (tx) => {
    const unk = await tx.unknownScan.findUnique({
      where: { id: safeUnknownId },
    });
    if (!unk || unk.resolvedAt) {
      throw new Error("Este escaneo ya está resuelto.");
    }

    const asset = await tx.asset.findUnique({
      where: { id: safeAssetId },
      select: { id: true, barcode: true },
    });
    if (!asset) throw new Error("Item no encontrado.");

    // Si el asset NO tenía barcode, le seteamos este.
    if (!asset.barcode) {
      await tx.asset.update({
        where: { id: safeAssetId },
        data: { barcode: unk.barcode },
      });
    }

    // Sumar / crear la línea del asset con el count del unknown.
    await tx.scanLine.upsert({
      where: {
        sessionId_assetId: {
          sessionId: unk.sessionId,
          assetId: safeAssetId,
        },
      },
      create: {
        sessionId: unk.sessionId,
        assetId: safeAssetId,
        barcode: unk.barcode,
        qty: unk.count,
        lastScanAt: new Date(),
      },
      update: {
        qty: { increment: unk.count },
        lastScanAt: new Date(),
      },
    });

    await tx.unknownScan.update({
      where: { id: safeUnknownId },
      data: { resolvedAt: new Date(), resolvedToAssetId: safeAssetId },
    });
  });
}

/** Crea un asset nuevo con ese barcode y lo vincula a la línea. Útil
 *  cuando el desconocido es algo que recién compraste y querés tenerlo
 *  en el catálogo. */
export async function resolveUnknownCreateAction(
  unknownId: string,
  assetInput: AdhocAssetInput,
): Promise<{ assetId: string }> {
  await requireUser();
  const safeUnknownId = parseId(unknownId, "unknownId");
  const data = adhocAssetSchema.parse(assetInput);

  return await prisma.$transaction(async (tx) => {
    const unk = await tx.unknownScan.findUnique({
      where: { id: safeUnknownId },
    });
    if (!unk || unk.resolvedAt) {
      throw new Error("Este escaneo ya está resuelto.");
    }

    const asset = await tx.asset.create({
      data: {
        sku: makeSku(data.category, data.brand),
        name: data.name,
        brand: data.brand,
        category: data.category || "Otros",
        stock: 0, // se ajusta cuando se confirme la sesión IN
        threshold: data.threshold,
        status: assetStatusToDb(statusFromStock(0, data.threshold)),
        barcode: unk.barcode,
      },
      select: { id: true },
    });

    await tx.scanLine.create({
      data: {
        sessionId: unk.sessionId,
        assetId: asset.id,
        barcode: unk.barcode,
        qty: unk.count,
        lastScanAt: new Date(),
      },
    });

    await tx.unknownScan.update({
      where: { id: safeUnknownId },
      data: { resolvedAt: new Date(), resolvedToAssetId: asset.id },
    });

    return { assetId: asset.id };
  });
}

export async function dismissUnknownAction(unknownId: string): Promise<void> {
  await requireUser();
  const safeUnknownId = parseId(unknownId, "unknownId");
  await prisma.unknownScan.delete({ where: { id: safeUnknownId } });
}

export async function cancelScanSessionAction(
  sessionId: string,
): Promise<void> {
  await requireUser();
  const safeId = parseId(sessionId, "sessionId");
  await prisma.scanSession.update({
    where: { id: safeId },
    data: { status: "CANCELLED" },
  });
}

/** Aplica todas las líneas como Movements y cierra la sesión. Falla
 *  si hay desconocidos sin resolver (el user los tiene que vincular o
 *  descartar primero). Todo en una sola transacción para garantizar
 *  consistencia. */
export type ConfirmResult =
  | {
      ok: true;
      applied: number;
      totalDelta: number;
    }
  | { ok: false; reason: string };

export async function confirmScanSessionAction(
  sessionId: string,
): Promise<ConfirmResult> {
  const user = await requireUser();
  const safeId = parseId(sessionId, "sessionId");

  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.scanSession.findUnique({
      where: { id: safeId },
      include: {
        lines: { select: { id: true, assetId: true, qty: true } },
        unknowns: { where: { resolvedAt: null }, select: { id: true } },
      },
    });
    if (!session) return { ok: false as const, reason: "Sesión no encontrada." };
    if (session.status !== "OPEN") {
      return { ok: false as const, reason: "La sesión ya no está abierta." };
    }
    if (session.unknowns.length > 0) {
      return {
        ok: false as const,
        reason: `Hay ${session.unknowns.length} código${
          session.unknowns.length === 1 ? "" : "s"
        } sin resolver. Vinculalos o descartalos antes de confirmar.`,
      };
    }
    if (session.lines.length === 0) {
      return { ok: false as const, reason: "No hay items para aplicar." };
    }

    const isIn = session.kind === "IN";
    let totalDelta = 0;

    for (const line of session.lines) {
      const asset = await tx.asset.findUnique({
        where: { id: line.assetId },
        select: { stock: true, threshold: true },
      });
      if (!asset) {
        return {
          ok: false as const,
          reason: "Un item de la sesión ya no existe en el inventario.",
        };
      }
      const delta = isIn ? line.qty : -line.qty;
      const nextStock = asset.stock + delta;
      if (nextStock < 0) {
        return {
          ok: false as const,
          reason: `No hay stock suficiente para descontar ${line.qty} unidades de un item (stock actual: ${asset.stock}).`,
        };
      }

      await tx.asset.update({
        where: { id: line.assetId },
        data: {
          stock: nextStock,
          status: assetStatusToDb(
            statusFromStock(nextStock, asset.threshold),
          ),
          updatedAt: new Date(),
        },
      });

      await tx.movement.create({
        data: {
          assetId: line.assetId,
          type: isIn ? "IN" : "OUT",
          qty: line.qty,
          delta,
          sourceKind: "SCAN_SESSION",
          sourceRef: session.id,
          actorId: user.id,
          note: `Sesión ${session.name}`,
          prevStock: asset.stock,
          nextStock,
        },
      });

      totalDelta += Math.abs(delta);
    }

    await tx.scanSession.update({
      where: { id: safeId },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });

    return {
      ok: true as const,
      applied: session.lines.length,
      totalDelta,
    };
  });

  if (result.ok) revalidateDomainPaths();
  return result;
}

export async function renameScanSessionAction(
  sessionId: string,
  name: string,
): Promise<void> {
  await requireUser();
  const safeId = parseId(sessionId, "sessionId");
  const safeName = z.string().trim().min(1).max(120).parse(name);
  await prisma.scanSession.update({
    where: { id: safeId },
    data: { name: safeName },
  });
}

// ============================================================
// Búsqueda para vincular desconocidos
// ============================================================

const searchSchema = z.object({
  query: z.string().trim().max(120),
  limit: z.number().int().min(1).max(20).default(8),
});

export async function searchAssetsForLinkAction(input: {
  query: string;
  limit?: number;
}): Promise<
  Array<{
    id: string;
    name: string;
    brand: string;
    category: string;
    sku: string;
    barcode: string | null;
    stock: number;
  }>
> {
  await requireUser();
  const data = searchSchema.parse(input);
  if (!data.query) return [];

  const rows = await prisma.asset.findMany({
    where: {
      OR: [
        { name: { contains: data.query, mode: "insensitive" } },
        { brand: { contains: data.query, mode: "insensitive" } },
        { sku: { contains: data.query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      brand: true,
      category: true,
      sku: true,
      barcode: true,
      stock: true,
    },
    orderBy: { name: "asc" },
    take: data.limit,
  });

  return rows;
}

export async function linkAssetIds(input: {
  assetId: string;
  barcode: string;
}): Promise<void> {
  await requireUser();
  // Idempotency input parser
  z.object({ assetId: idSchema, barcode: barcodeSchema }).parse(input);
  const barcode = normalizeBarcode(input.barcode);
  await prisma.asset.update({
    where: { id: input.assetId },
    data: { barcode },
  });
  revalidateDomainPaths();
}
