// Tipos y helpers puros de scan. Sin "use client" — los consumen
// también server actions y queries.

export type ScanKind = "in" | "out";

export type ScanStatus = "open" | "confirmed" | "cancelled";

export type ScanLine = {
  id: string;
  assetId: string;
  /** Datos del asset al momento de la sesión (capturados para que la línea
   *  siga teniendo contexto aunque el asset cambie de nombre/categoría
   *  después). */
  assetName: string;
  assetBrand: string;
  assetCategory: string;
  /** Stock actual del asset (cuando se cargó la sesión). Sirve para
   *  mostrar el delta al confirmar. */
  currentStock: number;
  qty: number;
  barcode: string | null;
  lastScanAt: Date;
};

export type UnknownScan = {
  id: string;
  barcode: string;
  count: number;
  firstScanAt: Date;
  resolvedAt: Date | null;
  resolvedToAssetId: string | null;
};

export type ScanSession = {
  id: string;
  name: string;
  kind: ScanKind;
  status: ScanStatus;
  actorId: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
  lines: ScanLine[];
  unknowns: UnknownScan[];
};

export type ScanSessionSummary = {
  id: string;
  name: string;
  kind: ScanKind;
  status: ScanStatus;
  createdAt: Date;
  confirmedAt: Date | null;
  totalLines: number;
  totalUnits: number;
  pendingUnknowns: number;
};

export const KIND_LABEL: Record<ScanKind, string> = {
  in: "Ingreso",
  out: "Egreso",
};

export const STATUS_LABEL: Record<ScanStatus, string> = {
  open: "Abierta",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};

export const STATUS_TONE: Record<
  ScanStatus,
  { dot: string; bg: string; text: string; ring: string }
> = {
  open: {
    dot: "bg-status-info",
    bg: "bg-status-info-soft",
    text: "text-status-info",
    ring: "ring-status-info/30",
  },
  confirmed: {
    dot: "bg-status-healthy",
    bg: "bg-status-healthy-soft",
    text: "text-status-healthy",
    ring: "ring-status-healthy/30",
  },
  cancelled: {
    dot: "bg-muted-foreground",
    bg: "bg-muted",
    text: "text-muted-foreground",
    ring: "ring-foreground/10",
  },
};

export const KIND_TONE: Record<
  ScanKind,
  { dot: string; bg: string; text: string; ring: string }
> = {
  in: {
    dot: "bg-status-healthy",
    bg: "bg-status-healthy-soft",
    text: "text-status-healthy",
    ring: "ring-status-healthy/30",
  },
  out: {
    dot: "bg-status-low",
    bg: "bg-status-low-soft",
    text: "text-status-low",
    ring: "ring-status-low/30",
  },
};

/** Normaliza un código de barras: trim, mayúsculas, sin espacios internos.
 *  Las pistolas USB-HID a veces agregan espacios fantasma cuando el código
 *  tiene ciertos caracteres especiales. Esta función deja todo consistente. */
export function normalizeBarcode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}
