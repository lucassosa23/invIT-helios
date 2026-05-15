import "server-only";

import { prisma } from "@/lib/prisma";

import { requestFromDb } from "./mappers";
import type { InternalRequest } from "./requests";

export async function getRequests(): Promise<InternalRequest[]> {
  const rows = await prisma.internalRequest.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(requestFromDb);
}
