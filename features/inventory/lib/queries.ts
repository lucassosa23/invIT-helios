import "server-only";

import { prisma } from "@/lib/prisma";
import type { Asset, Location } from "@/lib/fake-data";

import { assetFromDb, locationFromDb } from "./mappers";

export async function getInventory(): Promise<Asset[]> {
  const rows = await prisma.asset.findMany({
    orderBy: [{ name: "asc" }],
  });
  return rows.map(assetFromDb);
}

export async function getInventoryLocations(): Promise<Location[]> {
  const rows = await prisma.location.findMany({
    orderBy: { name: "asc" },
  });
  return rows.map(locationFromDb);
}
