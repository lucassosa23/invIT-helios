import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import { CACHE_TAGS } from "@/lib/helpers";
import { prisma } from "@/lib/prisma";

import { requestFromDb } from "./mappers";
import type { InternalRequest } from "./requests";

export const getRequests = cache(
  unstable_cache(
    async (): Promise<InternalRequest[]> => {
      const rows = await prisma.internalRequest.findMany({
        orderBy: { createdAt: "desc" },
      });
      return rows.map(requestFromDb);
    },
    ["requests:list"],
    { tags: [CACHE_TAGS.requests], revalidate: 60 },
  ),
);

/** Count rápido para el badge del sidebar (no necesita el listado completo). */
export const getPendingRequestsCount = cache(
  unstable_cache(
    async (): Promise<number> => {
      return await prisma.internalRequest.count({
        where: {
          status: { in: ["PENDING", "AWAITING_PURCHASE", "READY_TO_DELIVER"] },
        },
      });
    },
    ["requests:pending-count"],
    { tags: [CACHE_TAGS.requests], revalidate: 60 },
  ),
);
