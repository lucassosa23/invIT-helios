import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/helpers";
import { prisma } from "@/lib/prisma";
import type { Asset, Location } from "@/lib/fake-data";

import { assetFromDb, locationFromDb } from "./mappers";

// `cache()` deduplica dentro del mismo request (layout + page).
// `unstable_cache` persiste entre requests con tag para invalidar al
// mutar. TTL de 60s como red de seguridad si una mutation no llama
// revalidateTag.
export const getInventory = cache(
  unstable_cache(
    async (): Promise<Asset[]> => {
      const rows = await prisma.asset.findMany({
        orderBy: [{ name: "asc" }],
      });
      return rows.map(assetFromDb);
    },
    ["inventory:list"],
    { tags: [CACHE_TAGS.inventory], revalidate: 60 },
  ),
);

export const getInventoryLocations = cache(
  unstable_cache(
    async (): Promise<Location[]> => {
      const rows = await prisma.location.findMany({
        orderBy: { name: "asc" },
      });
      return rows.map(locationFromDb);
    },
    ["inventory:locations"],
    { tags: [CACHE_TAGS.inventory], revalidate: 300 },
  ),
);
