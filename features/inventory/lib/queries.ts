import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import type { Asset, Location } from "@/lib/fake-data";

import { assetFromDb, locationFromDb } from "./mappers";

// `cache()` deduplica la query dentro de un mismo request: layout + page
// que llaman getInventory() comparten el resultado, evitando ida y vuelta
// a la DB innecesaria.
export const getInventory = cache(async (): Promise<Asset[]> => {
  const rows = await prisma.asset.findMany({
    orderBy: [{ name: "asc" }],
  });
  return rows.map(assetFromDb);
});

export const getInventoryLocations = cache(async (): Promise<Location[]> => {
  const rows = await prisma.location.findMany({
    orderBy: { name: "asc" },
  });
  return rows.map(locationFromDb);
});
