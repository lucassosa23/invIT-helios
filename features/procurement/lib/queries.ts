import "server-only";

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
