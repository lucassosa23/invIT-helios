import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

import { sessionFromDb, kindFromDb, statusFromDb } from "./mappers";
import type { ScanSession, ScanSessionSummary } from "./scan";

/** Una sesión completa con líneas (incluyendo el asset asociado) y
 *  desconocidos. Usada por la página de detalle. No la cacheamos con
 *  unstable_cache porque cambia con cada scan y queremos read-your-own-
 *  writes inmediato. */
export const getScanSession = cache(
  async (id: string): Promise<ScanSession | null> => {
    const row = await prisma.scanSession.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            asset: {
              select: { name: true, brand: true, category: true, stock: true },
            },
          },
          orderBy: { lastScanAt: "desc" },
        },
        unknowns: {
          orderBy: { firstScanAt: "desc" },
        },
      },
    });
    return row ? sessionFromDb(row) : null;
  },
);

/** Listado liviano para la pantalla principal de /scan. No traemos las
 *  líneas — solo conteos y metadata. */
export const getScanSessions = cache(
  async (): Promise<ScanSessionSummary[]> => {
    const rows = await prisma.scanSession.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { lines: true } },
        lines: { select: { qty: true } },
        unknowns: { where: { resolvedAt: null }, select: { id: true } },
      },
      take: 50,
    });
    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      kind: kindFromDb(s.kind),
      status: statusFromDb(s.status),
      createdAt: s.createdAt,
      confirmedAt: s.confirmedAt ?? null,
      totalLines: s._count.lines,
      totalUnits: s.lines.reduce((sum, l) => sum + l.qty, 0),
      pendingUnknowns: s.unknowns.length,
    }));
  },
);
