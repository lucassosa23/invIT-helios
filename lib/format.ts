const usd = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdPrecise = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const compact = new Intl.NumberFormat("es-AR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const integer = new Intl.NumberFormat("es-AR");

const percent = new Intl.NumberFormat("es-AR", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function formatCurrency(n: number, opts?: { precise?: boolean }) {
  return (opts?.precise ? usdPrecise : usd).format(n);
}

export function formatCompact(n: number) {
  return compact.format(n);
}

export function formatNumber(n: number) {
  return integer.format(n);
}

export function formatPercent(n: number) {
  return percent.format(n);
}

const rtf = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });

export function formatRelative(date: Date | string | number): string {
  const d = new Date(date);
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 45) return rtf.format(diffSec, "second");
  if (abs < 45 * 60) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 22 * 3600) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 6 * 86400) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 28 * 86400) return rtf.format(Math.round(diffSec / 86400), "day");
  if (abs < 11 * 30 * 86400)
    return rtf.format(Math.round(diffSec / (30 * 86400)), "month");
  return rtf.format(Math.round(diffSec / (365 * 86400)), "year");
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Tailwind classes para mostrar el badge de stock según status del asset. */
export function stockTone(
  status: "healthy" | "low" | "critical" | "out",
): string {
  return status === "healthy"
    ? "bg-status-healthy-soft text-status-healthy ring-status-healthy/30"
    : status === "low"
      ? "bg-status-low-soft text-status-low ring-status-low/30"
      : "bg-status-critical-soft text-status-critical ring-status-critical/30";
}
