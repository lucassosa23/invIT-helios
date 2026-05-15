"use client";

import { useMemo, useState } from "react";
import {
  BoxesIcon,
  Check,
  Inbox,
  PackageCheck,
  Pencil,
  ShoppingCart,
  Undo2,
  X as XIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import { loadInventory } from "@/lib/storage";
import type { Asset } from "@/lib/fake-data";

import {
  canTransition,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  STATUS_LABEL,
  STATUS_TONE,
  type InternalRequest,
  type RequestStatus,
} from "../lib/requests";
import {
  applyDeliveryToInventory,
  approveRequestToPurchase,
  loadRequests,
  saveRequests,
} from "../lib/requests-storage";
import { AssetPickerDialog } from "./asset-picker-dialog";

type Props = {
  requests: InternalRequest[];
  hydrated: boolean;
  onEdit: (r: InternalRequest) => void;
  onCreate: () => void;
};

type PickerIntent = "link" | "deliver";
type FilterKey = RequestStatus | "active" | "history";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "pending", label: "Por decidir" },
  { key: "awaiting_purchase", label: "Esperando compra" },
  { key: "ready_to_deliver", label: "Listos para entregar" },
  { key: "active", label: "Todos los activos" },
  { key: "history", label: "Historial" },
];

const HISTORY_STATUSES: RequestStatus[] = ["delivered", "rejected"];
const ACTIVE_STATUSES: RequestStatus[] = [
  "pending",
  "awaiting_purchase",
  "ready_to_deliver",
];

export function RequestsList({ requests, hydrated, onEdit, onCreate }: Props) {
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [picker, setPicker] = useState<{
    request: InternalRequest;
    intent: PickerIntent;
  } | null>(null);

  const visible = useMemo(() => {
    if (filter === "active")
      return requests.filter((r) =>
        ACTIVE_STATUSES.includes(r.status),
      );
    if (filter === "history")
      return requests.filter((r) =>
        HISTORY_STATUSES.includes(r.status),
      );
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    let active = 0;
    let history = 0;
    for (const r of requests) {
      m[r.status] = (m[r.status] ?? 0) + 1;
      if (ACTIVE_STATUSES.includes(r.status)) active++;
      if (HISTORY_STATUSES.includes(r.status)) history++;
    }
    m.active = active;
    m.history = history;
    return m;
  }, [requests]);

  const handlePicked = (asset: Asset) => {
    if (!picker) return;
    const { request, intent } = picker;
    const all = loadRequests();
    const updatedRequest: InternalRequest = {
      ...request,
      assetId: asset.id,
      status: "ready_to_deliver",
      approvedAt: request.approvedAt ?? new Date(),
    };
    const next = all.map((r) => (r.id === request.id ? updatedRequest : r));
    saveRequests(next);

    if (intent === "deliver") {
      // Continuar con la entrega usando el asset recién vinculado
      const res = applyDeliveryToInventory(updatedRequest);
      if (!res.ok) {
        toast.error("No se pudo entregar", { description: res.reason });
        setPicker(null);
        return;
      }
      const now = new Date();
      const finalRequests = loadRequests().map((r) =>
        r.id === request.id
          ? { ...r, status: "delivered" as RequestStatus, deliveredAt: now }
          : r,
      );
      saveRequests(finalRequests);
      toast.success("Entregado e inventario actualizado", {
        description: `${request.reference} · ${asset.name} · queda ${res.remainingStock}`,
      });
    } else {
      toast.success("Vinculado al stock", {
        description: `${request.reference} → ${asset.name} (${asset.stock} en stock)`,
      });
    }
    setPicker(null);
  };

  if (!hydrated) {
    return (
      <div className="rounded-xl bg-card p-8 ring-1 ring-foreground/10">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-3 w-64 animate-pulse rounded bg-muted/60" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl bg-card px-6 py-16 text-center ring-1 ring-foreground/10">
        <div className="flex flex-col items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-muted/60 text-muted-foreground ring-1 ring-foreground/5">
            <Inbox className="size-5" />
          </span>
          <div>
            <p className="text-[14px] font-semibold">Sin pedidos todavía</p>
            <p className="mt-1 max-w-[34ch] text-[12.5px] text-muted-foreground">
              Registrá pedidos del equipo para llevar un control de qué se entrega
              y qué hay que comprar.
            </p>
          </div>
          <Button size="sm" onClick={onCreate}>
            Crear el primer pedido
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <div className="inline-flex min-w-full items-center gap-1 rounded-xl bg-card p-1 ring-1 ring-foreground/10">
          {FILTERS.map((f) => {
            const count = counts[f.key] ?? 0;
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/25"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                <span>{f.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums leading-none",
                    active
                      ? "bg-primary/20 text-primary"
                      : "bg-muted/70 text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {visible.map((r, i) => (
            <RequestRow
              key={r.id}
              request={r}
              delay={i * 0.02}
              onEdit={onEdit}
              onRequestPicker={(intent) => setPicker({ request: r, intent })}
            />
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <li className="grid place-items-center rounded-xl bg-card px-4 py-10 text-center text-[12.5px] text-muted-foreground ring-1 ring-foreground/10">
            No hay pedidos con ese filtro.
          </li>
        )}
      </ul>

      <AssetPickerDialog
        open={!!picker}
        onOpenChange={(v) => {
          if (!v) setPicker(null);
        }}
        request={picker?.request ?? null}
        onPick={handlePicked}
      />
    </section>
  );
}

function RequestRow({
  request,
  delay,
  onEdit,
  onRequestPicker,
}: {
  request: InternalRequest;
  delay: number;
  onEdit: (r: InternalRequest) => void;
  onRequestPicker: (intent: "link" | "deliver") => void;
}) {
  const tone = STATUS_TONE[request.status];

  const approve = () => {
    const inventory = loadInventory() ?? [];
    const asset = request.assetId
      ? inventory.find((a) => a.id === request.assetId)
      : undefined;
    const stock = asset?.stock ?? 0;

    if (asset && stock >= request.qty) {
      // Hay stock → ready_to_deliver
      const all = loadRequests();
      const next = all.map((x) =>
        x.id === request.id
          ? {
              ...x,
              status: "ready_to_deliver" as RequestStatus,
              approvedAt: x.approvedAt ?? new Date(),
            }
          : x,
      );
      saveRequests(next);
      toast.success("Pedido aprobado · listo para entregar", {
        description: `${request.reference} · stock alcanza (${stock} disponibles)`,
      });
      return;
    }

    // No hay stock o no es del catálogo → awaiting_purchase + vincular a PO
    const { orderReference } = approveRequestToPurchase(request);
    toast.success("Pedido aprobado · sumado a la compra del mes", {
      description: `${request.reference} → ${orderReference}`,
    });
  };

  const deliver = () => {
    if (!canTransition(request.status, "delivered")) return;
    // Si el pedido no tiene assetId (ad-hoc sin match auto), abrir picker
    // para que el usuario elija a qué item del stock corresponde.
    if (!request.assetId) {
      onRequestPicker("deliver");
      return;
    }
    const res = applyDeliveryToInventory(request);
    if (!res.ok) {
      toast.error("No se pudo entregar", { description: res.reason });
      return;
    }
    const all = loadRequests();
    const now = new Date();
    const next = all.map((x) =>
      x.id === request.id
        ? { ...x, status: "delivered" as RequestStatus, deliveredAt: now }
        : x,
    );
    saveRequests(next);
    toast.success("Entregado e inventario actualizado", {
      description: `${request.reference} · -${request.qty} ${request.itemName} · queda ${res.remainingStock}`,
    });
  };

  const reject = () => {
    if (!canTransition(request.status, "rejected")) return;
    const all = loadRequests();
    const now = new Date();
    const next = all.map((x) =>
      x.id === request.id
        ? {
            ...x,
            status: "rejected" as RequestStatus,
            rejectedAt: now,
            linkedOrderId: undefined,
          }
        : x,
    );
    saveRequests(next);
    toast(`${request.reference} rechazado`);
  };

  const markReadyManually = () => {
    // Intentar auto-match primero
    const inventory = loadInventory() ?? [];
    const want = request.itemName.trim().toLowerCase();
    const brand = request.brand.trim().toLowerCase();
    const autoMatch = request.assetId
      ? inventory.find((a) => a.id === request.assetId)
      : inventory.find((a) => {
          if (a.name.trim().toLowerCase() !== want) return false;
          if (!brand) return true;
          return a.brand.trim().toLowerCase() === brand;
        });

    if (autoMatch) {
      const all = loadRequests();
      const next = all.map((x) =>
        x.id === request.id
          ? {
              ...x,
              status: "ready_to_deliver" as RequestStatus,
              assetId: autoMatch.id,
              approvedAt: x.approvedAt ?? new Date(),
            }
          : x,
      );
      saveRequests(next);
      toast.success("Vinculado al stock", {
        description: `${request.reference} → ${autoMatch.name} (${autoMatch.stock} en stock)`,
      });
      return;
    }

    // No hay auto-match → abrir picker
    onRequestPicker("link");
  };

  const reactivate = () => {
    const all = loadRequests();
    const next = all.map((x) =>
      x.id === request.id
        ? {
            ...x,
            status: "pending" as RequestStatus,
            rejectedAt: undefined,
            rejectionReason: undefined,
          }
        : x,
    );
    saveRequests(next);
    toast.info(`${request.reference} reactivado como pendiente`);
  };

  const initials = request.requesterName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25, delay }}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/20 sm:px-5"
    >
      <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-primary/10 text-[13px] font-semibold text-primary-foreground ring-1 ring-primary/30">
        {initials || "?"}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {request.reference}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none ring-1",
              PRIORITY_TONE[request.priority],
            )}
          >
            {PRIORITY_LABEL[request.priority]}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none ring-1",
              tone.bg,
              tone.text,
              tone.ring,
            )}
          >
            <span className={cn("size-1.5 rounded-full", tone.dot)} />
            {STATUS_LABEL[request.status]}
          </span>
          {request.linkedOrderId && request.status === "awaiting_purchase" && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-2.5 py-1 text-[11.5px] font-medium leading-none text-muted-foreground">
              <ShoppingCart className="size-3.5" />
              vinculado a compra
            </span>
          )}
        </div>
        <p className="mt-1.5 truncate text-[14.5px] leading-snug">
          <span className="font-semibold">{request.requesterName}</span>{" "}
          <span className="text-muted-foreground">pidió</span>{" "}
          <span className="font-semibold tabular-nums">{request.qty}</span>{" "}
          <span className="text-muted-foreground">×</span>{" "}
          <span className="font-medium">{request.itemName}</span>
        </p>
        <p className="mt-1 truncate text-[12.5px] text-muted-foreground">
          {request.requesterTeam || "Sin equipo"} ·{" "}
          {formatRelative(request.createdAt)}
          {request.reason && (
            <>
              {" · "}
              <span className="italic">“{request.reason}”</span>
            </>
          )}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {request.status === "pending" && (
          <>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => onEdit(request)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Editar"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={reject}
              className="text-muted-foreground hover:bg-status-critical/15 hover:text-status-critical"
            >
              <XIcon className="size-3.5" />
              Rechazar
            </Button>
            <Button type="button" size="xs" onClick={approve}>
              <Check className="size-3.5" />
              Aprobar
            </Button>
          </>
        )}

        {request.status === "awaiting_purchase" && (
          <>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={reject}
              className="text-muted-foreground hover:bg-status-critical/15 hover:text-status-critical"
            >
              <XIcon className="size-3.5" />
              Rechazar
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={markReadyManually}
              title="Si ya tenés el item en stock, marcalo como listo"
            >
              <BoxesIcon className="size-3.5" />
              Ya tengo stock
            </Button>
          </>
        )}

        {request.status === "ready_to_deliver" && (
          <>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={reject}
              className="text-muted-foreground hover:bg-status-critical/15 hover:text-status-critical"
            >
              <XIcon className="size-3.5" />
              Rechazar
            </Button>
            <Button type="button" size="xs" onClick={deliver}>
              <PackageCheck className="size-3.5" />
              Entregar
            </Button>
          </>
        )}

        {request.status === "rejected" && (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={reactivate}
            className="text-muted-foreground hover:text-foreground"
          >
            <Undo2 className="size-3.5" />
            Reactivar
          </Button>
        )}

        {request.status === "delivered" && (
          <span className="text-[12.5px] text-muted-foreground">
            {formatRelative(request.deliveredAt ?? request.createdAt)}
          </span>
        )}
      </div>
    </motion.li>
  );
}
