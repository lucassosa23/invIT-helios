import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

import { requestFromDb } from "./mappers";
import type { InternalRequest } from "./requests";

export const getRequests = cache(async (): Promise<InternalRequest[]> => {
  const rows = await prisma.internalRequest.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(requestFromDb);
});
