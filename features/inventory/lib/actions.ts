"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/current-user";
import { statusFromStock } from "@/lib/fake-data";
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

function makeSku(category: string, brand: string): string {
  const c = (category.slice(0, 3) || "NEW").toUpperCase();
  const b = (brand.slice(0, 3) || "GEN").toUpperCase();
  const rand = Math.random().toString(36).slice(-4).toUpperCase();
  return `${c}-${b}-${rand}`;
}

function revalidateInventoryPaths() {
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

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
    },
  });

  revalidateInventoryPaths();
}

export async function updateAssetAction(
  id: string,
  values: ItemFormValuesInput,
) {
  await requireUser();
  const v = itemValuesSchema.parse(values);
  const status = statusFromStock(v.stock, v.threshold);

  await prisma.asset.update({
    where: { id },
    data: {
      name: v.name.trim(),
      brand: v.brand.trim(),
      category: v.category.trim() || "Otros",
      stock: v.stock,
      threshold: v.threshold,
      locationId: v.locationId || null,
      status: statusToDb(status),
    },
  });

  revalidateInventoryPaths();
}

export async function adjustAssetStockAction(id: string, delta: number) {
  await requireUser();

  const current = await prisma.asset.findUniqueOrThrow({
    where: { id },
    select: { stock: true, threshold: true },
  });

  const nextStock = Math.max(0, current.stock + delta);
  if (nextStock === current.stock) return;

  await prisma.asset.update({
    where: { id },
    data: {
      stock: nextStock,
      status: statusToDb(statusFromStock(nextStock, current.threshold)),
    },
  });

  revalidateInventoryPaths();
}

export async function deleteAssetAction(id: string) {
  await requireUser();
  await prisma.asset.delete({ where: { id } });
  revalidateInventoryPaths();
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
  revalidateInventoryPaths();
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

  revalidateInventoryPaths();
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

  revalidateInventoryPaths();
}

export async function clearInventoryAction() {
  await requireUser();
  await prisma.asset.deleteMany({});
  revalidateInventoryPaths();
}
