import { faker } from "@faker-js/faker";

faker.seed(20260511);

// ============================================================
// Types
// ============================================================

export type Status = "healthy" | "low" | "critical" | "out";
export type ProcurementStatus = "pending" | "ready" | "ordered" | "received";
export type RequestStatus = "pending" | "approved" | "ordered" | "delivered";
export type Priority = "low" | "medium" | "high" | "urgent";

export type Vendor = {
  id: string;
  name: string;
  category: string;
  rating: number;
};

export type Location = {
  id: string;
  name: string;
  zone: string;
};

export type Asset = {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  stock: number;
  threshold: number;
  unitCost: number;
  locationId: string;
  vendorId: string;
  warrantyExpiresAt: Date;
  status: Status;
  updatedAt: Date;
  dismissedFromAutoPlan?: boolean;
  barcode?: string;
};

export type RequestItem = {
  id: string;
  reference: string;
  requester: { name: string; team: string };
  itemName: string;
  category: string;
  qty: number;
  priority: Priority;
  status: RequestStatus;
  createdAt: Date;
  comments: number;
};

export type ProcurementItem = {
  id: string;
  reference: string;
  itemName: string;
  category: string;
  qty: number;
  unitCost: number;
  vendorId: string;
  priority: Priority;
  status: ProcurementStatus;
  expectedBy: Date;
  createdAt: Date;
};

export type ActivityEventKind =
  | "stock.added"
  | "stock.removed"
  | "stock.alert"
  | "procurement.queued"
  | "procurement.ordered"
  | "procurement.received"
  | "request.created"
  | "request.approved"
  | "request.delivered"
  | "warranty.alert";

export type ActivityEvent = {
  id: string;
  kind: ActivityEventKind;
  actor: string;
  summary: string;
  meta?: string;
  at: Date;
};

// ============================================================
// Seed catalogs (realistic IT inventory)
// ============================================================

const CATALOG: Array<{
  name: string;
  brand: string;
  category: string;
  unitCost: number;
}> = [
  // Notebooks
  { name: "ThinkPad T14 Gen 4 · i7 / 32GB / 1TB", brand: "Lenovo", category: "Notebook", unitCost: 1850 },
  { name: "ThinkPad X1 Carbon Gen 12", brand: "Lenovo", category: "Notebook", unitCost: 2390 },
  { name: "Latitude 5440 · i5 / 16GB / 512GB", brand: "Dell", category: "Notebook", unitCost: 1390 },
  { name: "EliteBook 840 G11", brand: "HP", category: "Notebook", unitCost: 1620 },
  { name: "MacBook Air M3 · 16GB / 512GB", brand: "Apple", category: "Notebook", unitCost: 1750 },
  // Monitors
  { name: "U2723QE 27\" 4K USB-C Hub", brand: "Dell", category: "Monitor", unitCost: 560 },
  { name: "27UP850-W 27\" 4K", brand: "LG", category: "Monitor", unitCost: 420 },
  { name: "E27u G5 27\" QHD", brand: "HP", category: "Monitor", unitCost: 380 },
  { name: "P2422HE 24\" FHD", brand: "Dell", category: "Monitor", unitCost: 230 },
  // Keyboards / Mice
  { name: "MX Keys S — Wireless", brand: "Logitech", category: "Keyboard", unitCost: 110 },
  { name: "K2 V2 — Mechanical 75%", brand: "Keychron", category: "Keyboard", unitCost: 95 },
  { name: "MX Master 3S", brand: "Logitech", category: "Mouse", unitCost: 95 },
  { name: "DeathAdder V3", brand: "Razer", category: "Mouse", unitCost: 60 },
  // Storage
  { name: "980 PRO 2TB NVMe", brand: "Samsung", category: "SSD", unitCost: 160 },
  { name: "KC3000 1TB NVMe", brand: "Kingston", category: "SSD", unitCost: 95 },
  { name: "Black SN850X 2TB", brand: "WD", category: "SSD", unitCost: 175 },
  { name: "Red Pro 8TB", brand: "WD", category: "HDD", unitCost: 220 },
  // Memory
  { name: "DDR4 16GB 3200MHz SODIMM", brand: "Crucial", category: "RAM", unitCost: 38 },
  { name: "Vengeance DDR5 32GB Kit", brand: "Corsair", category: "RAM", unitCost: 130 },
  // Networking
  { name: "hAP ax² Router", brand: "Mikrotik", category: "Networking", unitCost: 145 },
  { name: "UniFi U6-Pro AP", brand: "Ubiquiti", category: "Networking", unitCost: 175 },
  { name: "Catalyst 1300 24-port", brand: "Cisco", category: "Networking", unitCost: 690 },
  // Cabling
  { name: "USB-C 100W 1m Cable", brand: "Anker", category: "Cable", unitCost: 18 },
  { name: "HDMI 2.1 8K 2m", brand: "Belkin", category: "Cable", unitCost: 26 },
  { name: "Cat6 UTP — 50m roll", brand: "Furukawa", category: "Cable", unitCost: 70 },
  // Mobile
  { name: "iPad (10th gen) 64GB Wi-Fi", brand: "Apple", category: "Tablet", unitCost: 350 },
  { name: "Galaxy Tab S9 128GB", brand: "Samsung", category: "Tablet", unitCost: 720 },
  // Audio / Video
  { name: "C920 HD Pro Webcam", brand: "Logitech", category: "Webcam", unitCost: 75 },
  { name: "Voyager Focus 2 UC", brand: "Poly", category: "Headset", unitCost: 280 },
  { name: "MeetUp Conference Cam", brand: "Logitech", category: "Webcam", unitCost: 740 },
  // Printers / Peripherals
  { name: "HL-L2350DW Laser B/N", brand: "Brother", category: "Printer", unitCost: 220 },
  { name: "LaserJet Pro M404dn", brand: "HP", category: "Printer", unitCost: 310 },
  { name: "USB-C Triple 4K Dock", brand: "Targus", category: "Dock", unitCost: 240 },
  { name: "Thunderbolt 4 Hub", brand: "CalDigit", category: "Dock", unitCost: 320 },
  // UPS / Power
  { name: "Back-UPS BX1500M-LM", brand: "APC", category: "UPS", unitCost: 290 },
  { name: "Smart-UPS 750VA RM", brand: "APC", category: "UPS", unitCost: 540 },
];

const VENDORS_RAW: Array<Omit<Vendor, "id">> = [
  { name: "Compumundo Empresas", category: "Mayorista IT", rating: 4.6 },
  { name: "Stylus Online", category: "Hardware", rating: 4.4 },
  { name: "Hardstore", category: "Componentes", rating: 4.7 },
  { name: "Tecno Help", category: "Servicios IT", rating: 4.2 },
  { name: "DELL Direct AR", category: "Fabricante", rating: 4.8 },
  { name: "HP Store Argentina", category: "Fabricante", rating: 4.6 },
  { name: "Insumotec", category: "Insumos", rating: 4.3 },
  { name: "MercadoLibre B2B", category: "Marketplace", rating: 4.1 },
];

const LOCATIONS_RAW: Array<Omit<Location, "id">> = [
  { name: "Sede Central — Datacenter", zone: "CABA" },
  { name: "Sede Central — Soporte IT", zone: "CABA" },
  { name: "Sede Central — Depósito", zone: "CABA" },
  { name: "Sucursal Belgrano", zone: "CABA" },
  { name: "Sucursal Caballito", zone: "CABA" },
  { name: "Sucursal Palermo", zone: "CABA" },
  { name: "Sucursal San Isidro", zone: "GBA Norte" },
  { name: "Sucursal Vicente López", zone: "GBA Norte" },
];

const TEAMS = [
  "Soporte IT",
  "Desarrollo",
  "Administración",
  "RRHH",
  "Médica",
  "Recepción",
  "Laboratorio",
  "Imágenes",
];

const REQUESTER_NAMES = [
  "Camila Rivero",
  "Mariano Ferreyra",
  "Lucía Saavedra",
  "Tomás Aguirre",
  "Florencia Méndez",
  "Bruno Iturralde",
  "Carolina Ledesma",
  "Diego Pérez Roldán",
  "Sofía Bertoni",
  "Ezequiel Quiroga",
  "Natalia Cohen",
  "Joaquín Morales",
];

// ============================================================
// Dataset builders
// ============================================================

const skuOf = (a: { brand: string; category: string }, n: number) =>
  `${a.category.slice(0, 3).toUpperCase()}-${a.brand
    .slice(0, 3)
    .toUpperCase()}-${String(n).padStart(4, "0")}`;

export function statusFromStock(stock: number, threshold: number): Status {
  if (stock <= 0) return "out";
  if (stock <= Math.max(1, Math.floor(threshold * 0.4))) return "critical";
  if (stock < threshold) return "low";
  return "healthy";
}

function buildVendors(): Vendor[] {
  return VENDORS_RAW.map((v, i) => ({
    id: `vnd_${(i + 1).toString().padStart(2, "0")}`,
    ...v,
  }));
}

function buildLocations(): Location[] {
  return LOCATIONS_RAW.map((l, i) => ({
    id: `loc_${(i + 1).toString().padStart(2, "0")}`,
    ...l,
  }));
}

function buildAssets(vendors: Vendor[], locations: Location[]): Asset[] {
  return CATALOG.map((item, i) => {
    const threshold = faker.number.int({ min: 4, max: 14 });
    const roll = faker.number.float({ min: 0, max: 1 });
    let stock: number;
    if (roll < 0.08) stock = 0;
    else if (roll < 0.22) stock = faker.number.int({ min: 1, max: Math.max(1, Math.floor(threshold * 0.35)) });
    else if (roll < 0.45) stock = faker.number.int({ min: Math.max(1, Math.floor(threshold * 0.5)), max: threshold - 1 });
    else stock = faker.number.int({ min: threshold, max: threshold * 4 });
    const updatedAt = faker.date.recent({ days: 21 });
    return {
      id: `ast_${(i + 1).toString().padStart(3, "0")}`,
      sku: skuOf(item, i + 1),
      name: item.name,
      brand: item.brand,
      category: item.category,
      stock,
      threshold,
      unitCost: item.unitCost,
      locationId: faker.helpers.arrayElement(locations).id,
      vendorId: faker.helpers.arrayElement(vendors).id,
      warrantyExpiresAt: faker.date.between({
        from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 3),
      }),
      status: statusFromStock(stock, threshold),
      updatedAt,
    };
  });
}

function buildRequests(assets: Asset[]): RequestItem[] {
  const count = 14;
  const statuses: RequestStatus[] = ["pending", "pending", "pending", "pending", "approved", "approved", "approved", "ordered", "ordered", "delivered", "delivered", "delivered", "approved", "pending"];
  const priorities: Priority[] = ["low", "medium", "medium", "high", "urgent", "medium", "low", "high", "medium", "low", "medium", "high", "urgent", "medium"];
  return Array.from({ length: count }).map((_, i) => {
    const asset = faker.helpers.arrayElement(assets);
    const created = faker.date.recent({ days: 18 });
    return {
      id: `req_${(i + 1).toString().padStart(3, "0")}`,
      reference: `REQ-${String(2400 + i).padStart(4, "0")}`,
      requester: {
        name: REQUESTER_NAMES[i % REQUESTER_NAMES.length]!,
        team: TEAMS[i % TEAMS.length]!,
      },
      itemName: asset.name,
      category: asset.category,
      qty: faker.number.int({ min: 1, max: 5 }),
      priority: priorities[i % priorities.length]!,
      status: statuses[i % statuses.length]!,
      createdAt: created,
      comments: faker.number.int({ min: 0, max: 6 }),
    };
  });
}

function buildProcurement(assets: Asset[], vendors: Vendor[]): ProcurementItem[] {
  const flagged = assets.filter((a) => a.status === "critical" || a.status === "out" || a.status === "low");
  const list: ProcurementItem[] = flagged.slice(0, 10).map((a, i) => {
    const statusBuckets: ProcurementStatus[] = ["pending", "pending", "ready", "ready", "ordered", "ordered", "received", "pending", "ready", "ordered"];
    const priorityBuckets: Priority[] = ["urgent", "high", "high", "medium", "high", "medium", "medium", "high", "medium", "low"];
    return {
      id: `prc_${(i + 1).toString().padStart(3, "0")}`,
      reference: `PO-${String(7100 + i).padStart(4, "0")}`,
      itemName: a.name,
      category: a.category,
      qty: faker.number.int({ min: Math.max(2, a.threshold), max: Math.max(4, a.threshold * 2) }),
      unitCost: a.unitCost,
      vendorId: faker.helpers.arrayElement(vendors).id,
      priority: priorityBuckets[i % priorityBuckets.length]!,
      status: statusBuckets[i % statusBuckets.length]!,
      expectedBy: faker.date.soon({ days: faker.number.int({ min: 4, max: 28 }) }),
      createdAt: faker.date.recent({ days: 10 }),
    };
  });
  return list;
}

function buildActivity(
  assets: Asset[],
  requests: RequestItem[],
  procurement: ProcurementItem[],
): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  const pushEvt = (kind: ActivityEventKind, payload: { actor: string; summary: string; meta?: string; at: Date }) =>
    events.push({
      id: `evt_${(events.length + 1).toString().padStart(3, "0")}`,
      kind,
      actor: payload.actor,
      summary: payload.summary,
      meta: payload.meta,
      at: payload.at,
    });

  assets.slice(0, 3).forEach((a) => {
    pushEvt("stock.added", {
      actor: "Mariano F.",
      summary: `Ingresaron ${faker.number.int({ min: 4, max: 12 })} × ${a.name}`,
      meta: a.category,
      at: faker.date.recent({ days: 1 }),
    });
  });

  procurement.slice(0, 3).forEach((p) => {
    const kind: ActivityEventKind = p.status === "ordered" ? "procurement.ordered" : p.status === "received" ? "procurement.received" : "procurement.queued";
    pushEvt(kind, {
      actor: "Sistema",
      summary: `${p.reference} · ${p.itemName}`,
      meta:
        kind === "procurement.queued"
          ? "agregado a la cola de compras"
          : kind === "procurement.ordered"
            ? "orden enviada al proveedor"
            : "recibido en depósito",
      at: faker.date.recent({ days: 3 }),
    });
  });

  assets
    .filter((a) => a.status === "critical" || a.status === "out")
    .slice(0, 4)
    .forEach((a) => {
      pushEvt("stock.alert", {
        actor: "Sistema",
        summary: `${a.name} ${a.status === "out" ? "sin stock" : "bajo umbral"}`,
        meta: `${a.stock} / ${a.threshold}`,
        at: faker.date.recent({ days: 2 }),
      });
    });

  requests.slice(0, 4).forEach((r) => {
    pushEvt("request.created", {
      actor: r.requester.name,
      summary: `${r.reference} · ${r.itemName} (×${r.qty})`,
      meta: r.requester.team,
      at: faker.date.recent({ days: 5 }),
    });
  });

  pushEvt("warranty.alert", {
    actor: "Sistema",
    summary: "3 monitores próximos a vencer garantía",
    meta: "Sede Central",
    at: faker.date.recent({ days: 4 }),
  });

  return events.sort((a, b) => b.at.getTime() - a.at.getTime());
}

function buildMonthlyTrend(assets: Asset[]) {
  const months = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    return d;
  });
  const baseValue = assets.reduce((acc, a) => acc + a.stock * a.unitCost, 0);
  return months.map((d, i) => {
    const factor = 0.72 + (i / 11) * 0.32 + faker.number.float({ min: -0.05, max: 0.06 });
    const value = Math.round(baseValue * factor);
    const procurement = Math.round(
      value * faker.number.float({ min: 0.045, max: 0.085 }),
    );
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }),
      monthIndex: d.getMonth(),
      inventoryValue: value,
      procurementSpend: procurement,
    };
  });
}

// ============================================================
// Memoized dataset (one build per process)
// ============================================================

let cache: ReturnType<typeof build> | null = null;

function build() {
  const vendors = buildVendors();
  const locations = buildLocations();
  const assets = buildAssets(vendors, locations);
  const requests = buildRequests(assets);
  const procurement = buildProcurement(assets, vendors);
  const activity = buildActivity(assets, requests, procurement);
  const trend = buildMonthlyTrend(assets);
  return { vendors, locations, assets, requests, procurement, activity, trend };
}

export function getDataset() {
  if (!cache) cache = build();
  return cache;
}

// ============================================================
// Query helpers (data-access)
// ============================================================

export function getVendors() {
  return getDataset().vendors;
}

export function getLocations() {
  return getDataset().locations;
}

export function getAssets() {
  return getDataset().assets;
}

export function getRequests() {
  return getDataset().requests;
}

export function getProcurementQueue() {
  return getDataset().procurement;
}

export function getActivity(limit?: number) {
  const all = getDataset().activity;
  return typeof limit === "number" ? all.slice(0, limit) : all;
}

export function getMonthlyTrend() {
  return getDataset().trend;
}

export function getKpis() {
  const { assets, requests, procurement } = getDataset();

  const stockCritical = assets.filter(
    (a) => a.status === "critical" || a.status === "out",
  ).length;
  const pendingProcurement = procurement.filter(
    (p) => p.status === "pending" || p.status === "ready",
  ).length;
  const activeRequests = requests.filter(
    (r) => r.status === "pending" || r.status === "approved",
  ).length;

  const ninetyDays = Date.now() + 90 * 24 * 3600 * 1000;
  const warrantyExpiring = assets.filter((a) => {
    const t = a.warrantyExpiresAt.getTime();
    return t > Date.now() && t < ninetyDays;
  }).length;

  return {
    stockCritical,
    pendingProcurement,
    activeRequests,
    warrantyExpiring,
  };
}

export function getDashboardData() {
  return {
    kpis: getKpis(),
    activity: getActivity(10),
    alerts: getAssets()
      .filter((a) => a.status === "critical" || a.status === "out")
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 6),
    procurementPreview: getProcurementQueue()
      .filter((p) => p.status === "pending" || p.status === "ready")
      .slice(0, 5),
    pendingRequests: getRequests()
      .filter((r) => r.status === "pending")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5),
  };
}
