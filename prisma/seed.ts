/**
 * Seed inicial — pobla la DB con la data sintética que vivía en
 * `lib/fake-data.ts`. Es idempotente: si las tablas ya tienen filas,
 * no toca nada (para no duplicar).
 *
 * Correr:
 *   pnpm seed
 *
 * En CI / deploy, podemos invocarlo solo cuando la DB está vacía.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  getActivity,
  getAssets,
  getLocations,
  getProcurementQueue,
  getRequests,
  getVendors,
  type ProcurementStatus as FakeProcurementStatus,
  type Priority as FakePriority,
  type RequestStatus as FakeRequestStatus,
  type Status as FakeAssetStatus,
} from "../lib/fake-data";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

const STATUS_MAP: Record<FakeAssetStatus, "HEALTHY" | "LOW" | "CRITICAL" | "OUT"> =
  {
    healthy: "HEALTHY",
    low: "LOW",
    critical: "CRITICAL",
    out: "OUT",
  };

const PRIORITY_MAP: Record<FakePriority, "LOW" | "MEDIUM" | "HIGH" | "URGENT"> =
  {
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
    urgent: "URGENT",
  };

const REQUEST_STATUS_MAP: Record<
  FakeRequestStatus,
  "PENDING" | "AWAITING_PURCHASE" | "READY_TO_DELIVER" | "DELIVERED"
> = {
  pending: "PENDING",
  approved: "READY_TO_DELIVER",
  ordered: "AWAITING_PURCHASE",
  delivered: "DELIVERED",
};

const PO_STATUS_MAP: Record<
  FakeProcurementStatus,
  "DRAFT" | "READY" | "ORDERED" | "RECEIVED"
> = {
  pending: "DRAFT",
  ready: "READY",
  ordered: "ORDERED",
  received: "RECEIVED",
};

async function main() {
  console.log("🌱 invIT seed — empezando…");

  const existing = await prisma.asset.count();
  if (existing > 0) {
    console.log(
      `   La DB ya tiene ${existing} asset(s). Seed idempotente: no toco nada.`,
    );
    console.log(
      "   Si querés un reset duro: pnpm prisma migrate reset && pnpm seed",
    );
    return;
  }

  // Locations
  const fakeLocations = getLocations();
  console.log(`   · ${fakeLocations.length} locations`);
  await prisma.location.createMany({
    data: fakeLocations.map((l) => ({
      id: l.id,
      name: l.name,
      zone: l.zone,
    })),
  });

  // Vendors
  const fakeVendors = getVendors();
  console.log(`   · ${fakeVendors.length} vendors`);
  await prisma.vendor.createMany({
    data: fakeVendors.map((v) => ({
      id: v.id,
      name: v.name,
      category: v.category,
      rating: v.rating,
    })),
  });

  // Assets
  const fakeAssets = getAssets();
  console.log(`   · ${fakeAssets.length} assets`);
  await prisma.asset.createMany({
    data: fakeAssets.map((a) => ({
      id: a.id,
      sku: a.sku,
      name: a.name,
      brand: a.brand,
      category: a.category,
      stock: a.stock,
      threshold: a.threshold,
      unitCost: a.unitCost,
      locationId: a.locationId,
      vendorId: a.vendorId,
      warrantyExpiresAt: a.warrantyExpiresAt,
      status: STATUS_MAP[a.status],
      updatedAt: a.updatedAt,
    })),
  });

  // Requests
  const fakeRequests = getRequests();
  console.log(`   · ${fakeRequests.length} internal requests`);
  await prisma.internalRequest.createMany({
    data: fakeRequests.map((r) => ({
      id: r.id,
      reference: r.reference,
      requesterName: r.requester.name,
      requesterTeam: r.requester.team,
      itemName: r.itemName,
      brand: "",
      category: r.category,
      qty: r.qty,
      priority: PRIORITY_MAP[r.priority],
      reason: "",
      status: REQUEST_STATUS_MAP[r.status],
      createdAt: r.createdAt,
    })),
  });

  // Procurement queue → como Purchase Orders básicas (1 PO per fake item,
  // sin lines porque la fake-data no las modela como lines reales).
  const fakeProc = getProcurementQueue();
  console.log(`   · ${fakeProc.length} purchase orders`);
  for (const p of fakeProc) {
    await prisma.purchaseOrder.create({
      data: {
        id: p.id,
        reference: p.reference,
        status: PO_STATUS_MAP[p.status],
        lines: {
          create: [
            {
              name: p.itemName,
              brand: "",
              category: p.category,
              qty: p.qty,
              isNew: false,
            },
          ],
        },
      },
    });
  }

  // Activity → para esta versión inicial no migramos la lista de actividad
  // ad-hoc; los movements reales se van a generar al usar el scanner /
  // recibir órdenes / etc. La lista que devolvía getActivity era cosmética.
  void getActivity;

  console.log("✅ Seed completo.");
}

main()
  .catch((err) => {
    console.error("❌ Seed falló:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
