"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth/current-user";
import { statusFromStock } from "@/lib/fake-data";
import { makeSku, parseId, revalidateDomainPaths } from "@/lib/helpers";
import { prisma } from "@/lib/prisma";

import { statusToDb } from "./mappers";

// ============================================================
// Schemas
// ============================================================

const itemValuesSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(100).default(""),
  category: z.string().min(1).max(100),
  stock: z.number().int().min(0),
  threshold: z.number().int().min(1),
  locationId: z.string().optional(),
  dismissedFromAutoPlan: z.boolean().optional(),
  barcode: z.string().trim().max(64).nullish(),
});

const importRowSchema = z.object({
  name: z.string().min(1),
  brand: z.string().default(""),
  category: z.string().default("Otros"),
  stock: z.number().int().min(0),
  threshold: z.number().int().min(1),
  locationId: z.string().default(""),
  sku: z.string().optional(),
});

export type ItemFormValuesInput = z.input<typeof itemValuesSchema>;
export type ImportRowInput = z.input<typeof importRowSchema>;

// ============================================================
// Helpers
// ============================================================


// ============================================================
// Actions
// ============================================================

export async function addAssetAction(values: ItemFormValuesInput) {
  await requireUser();
  const v = itemValuesSchema.parse(values);
  const status = statusFromStock(v.stock, v.threshold);

  await prisma.asset.create({
    data: {
      sku: makeSku(v.category, v.brand),
      name: v.name.trim(),
      brand: v.brand.trim(),
      category: v.category.trim() || "Otros",
      stock: v.stock,
      threshold: v.threshold,
      locationId: v.locationId || null,
      status: statusToDb(status),
      dismissedFromAutoPlan: v.dismissedFromAutoPlan ?? false,
      barcode: v.barcode?.trim() || null,
    },
  });

  revalidateDomainPaths();
}

export async function updateAssetAction(
  id: string,
  values: ItemFormValuesInput,
) {
  await requireUser();
  const assetId = parseId(id, "assetId");
  const v = itemValuesSchema.parse(values);
  const status = statusFromStock(v.stock, v.threshold);

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      name: v.name.trim(),
      brand: v.brand.trim(),
      category: v.category.trim() || "Otros",
      stock: v.stock,
      threshold: v.threshold,
      locationId: v.locationId || null,
      status: statusToDb(status),
      dismissedFromAutoPlan: v.dismissedFromAutoPlan,
      barcode: v.barcode === undefined ? undefined : v.barcode?.trim() || null,
    },
  });

  revalidateDomainPaths();
}

export async function adjustAssetStockAction(id: string, delta: number) {
  await requireUser();
  const assetId = parseId(id, "assetId");

  const current = await prisma.asset.findUniqueOrThrow({
    where: { id: assetId },
    select: { stock: true, threshold: true },
  });

  const nextStock = Math.max(0, current.stock + delta);
  if (nextStock === current.stock) return;

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      stock: nextStock,
      status: statusToDb(statusFromStock(nextStock, current.threshold)),
    },
  });

  revalidateDomainPaths();
}

export async function deleteAssetAction(id: string) {
  await requireUser();
  const assetId = parseId(id, "assetId");
  await prisma.asset.delete({ where: { id: assetId } });
  revalidateDomainPaths();
}

export async function setAssetDismissedAction(id: string, dismissed: boolean) {
  await requireUser();
  const assetId = parseId(id, "assetId");
  await prisma.asset.update({
    where: { id: assetId },
    data: { dismissedFromAutoPlan: dismissed },
  });
  revalidateDomainPaths();
}

/** Inserta un asset con valores arbitrarios (usado para el "Deshacer"
 *  después de un delete: restauramos el item con su id original). */
export async function restoreAssetAction(asset: {
  id?: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  stock: number;
  threshold: number;
  locationId: string | null;
}) {
  await requireUser();
  const status = statusFromStock(asset.stock, asset.threshold);
  await prisma.asset.create({
    data: {
      id: asset.id,
      sku: asset.sku,
      name: asset.name,
      brand: asset.brand,
      category: asset.category,
      stock: asset.stock,
      threshold: asset.threshold,
      locationId: asset.locationId,
      status: statusToDb(status),
    },
  });
  revalidateDomainPaths();
}

export async function replaceInventoryAction(rows: ImportRowInput[]) {
  await requireUser();
  const parsed = rows.map((r) => importRowSchema.parse(r));

  await prisma.$transaction([
    prisma.asset.deleteMany({}),
    prisma.asset.createMany({
      data: parsed.map((r) => ({
        sku: r.sku || makeSku(r.category, r.brand),
        name: r.name.trim(),
        brand: r.brand.trim(),
        category: r.category.trim() || "Otros",
        stock: r.stock,
        threshold: r.threshold,
        locationId: r.locationId || null,
        status: statusToDb(statusFromStock(r.stock, r.threshold)),
      })),
    }),
  ]);

  revalidateDomainPaths();
}

export async function appendInventoryAction(rows: ImportRowInput[]) {
  await requireUser();
  const parsed = rows.map((r) => importRowSchema.parse(r));

  await prisma.asset.createMany({
    data: parsed.map((r) => ({
      sku: r.sku || makeSku(r.category, r.brand),
      name: r.name.trim(),
      brand: r.brand.trim(),
      category: r.category.trim() || "Otros",
      stock: r.stock,
      threshold: r.threshold,
      locationId: r.locationId || null,
      status: statusToDb(statusFromStock(r.stock, r.threshold)),
    })),
  });

  revalidateDomainPaths();
}

export async function clearInventoryAction() {
  await requireUser();
  await prisma.asset.deleteMany({});
  revalidateDomainPaths();
}
