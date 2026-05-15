"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  Inbox,
  PackagePlus,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/fake-data";
import { useInventory } from "@/lib/hooks";

import {
  isMonthlyPlan,
  type OrderLine,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "../lib/orders";
import { loadOrders } from "../lib/orders-storage";
import {
  createOrderAction,
  updateOrderAction,
} from "../lib/actions";
import {
  syncOrderRequestLinks,
  loadRequests,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  type InternalRequest,
} from "@/features/requests/lib/requests";
import {
  findActiveOrderForAsset,
  loadDismissed,
  markDismissed,
  markUndismissed,
} from "../lib/monthly-plan";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: PurchaseOrder | null;
};

function lineFromAsset(a: Asset, qty: number): OrderLine {
  return {
    id: `ln_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    assetId: a.id,
    name: a.name,
    brand: a.brand,
    category: a.category,
    isNew: false,
    qty,
  };
}

function adhocLine(name: string, brand: string, category: string, qty: number): OrderLine {
  return {
    id: `ln_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    brand,
    category: category || "Otros",
    isNew: true,
    qty,
  };
}

const REQUEST_LINE_PREFIX = "ln_req_";

function lineFromRequest(req: InternalRequest): OrderLine {
  return {
    id: `${REQUEST_LINE_PREFIX}${req.id}`,
    assetId: req.assetId,
    name: req.itemName,
    brand: req.brand,
    category: req.category || "Otros",
    isNew: !req.assetId,
    qty: req.qty,
  };
}

function requestIdFromLine(line: OrderLine): string | null {
  return line.id.startsWith(REQUEST_LINE_PREFIX)
    ? line.id.slice(REQUEST_LINE_PREFIX.length)
    : null;
}

function computeOpenRequests(
  editing: PurchaseOrder | null,
): InternalRequest[] {
  return loadRequests().filter(
    (r) =>
      r.status === "pending" ||
      (!!editing &&
        r.linkedOrderId === editing.id &&
        r.status === "awaiting_purchase"),
  );
}

function computeActiveOrderAssetIds(
  editing: PurchaseOrder | null,
): Set<string> {
  const ids = new Set<string>();
  for (const o of loadOrders()) {
    if (o.status === "received" || o.status === "cancelled") continue;
    if (editing && o.id === editing.id) continue;
    for (const l of o.lines) {
      if (l.assetId) ids.add(l.assetId);
    }
  }
  return ids;
}

export function NewOrderDialog({ open, onOpenChange, editing }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl md:max-w-5xl lg:max-w-6xl"
      >
        {open && (
          <NewOrderBody
            editing={editing ?? null}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NewOrderBody({
  editing,
  onClose,
}: {
  editing: PurchaseOrder | null;
  onClose: () => void;
}) {
  const inventory = useInventory();

  const [openRequests] = useState<InternalRequest[]>(() =>
    computeOpenRequests(editing),
  );
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() =>
    loadDismissed(),
  );
  const [activeOrderAssetIds] = useState<Set<string>>(() =>
    computeActiveOrderAssetIds(editing),
  );

  const [lines, setLines] = useState<OrderLine[]>(() =>
    editing ? editing.lines : [],
  );
  const [note, setNote] = useState(() => editing?.note ?? "");
  const [tab, setTab] = useState<string>(() => {
    if (editing) return openRequests.length > 0 ? "requests" : "search";
    return openRequests.some((r) => r.status === "pending")
      ? "requests"
      : "suggestions";
  });
  const [search, setSearch] = useState("");
  const [adhocName, setAdhocName] = useState("");
  const [adhocBrand, setAdhocBrand] = useState("");
  const [adhocCategory, setAdhocCategory] = useState("");
  const [adhocQty, setAdhocQty] = useState(1);

  const linesEndRef = useRef<HTMLLIElement | null>(null);

  const suggestions = useMemo(() => {
    // No sugerimos items que ya están en otra orden activa (plan + ready +
    // ordered + parciales) — esos ya forman parte del reporte mensual y
    // sería duplicar la compra.
    const inOtherOrder = (a: Asset) => activeOrderAssetIds.has(a.id);

    const critical = inventory
      .filter(
        (a) =>
          (a.status === "critical" || a.status === "out") &&
          !dismissedIds.has(a.id) &&
          !inOtherOrder(a),
      )
      .sort((a, b) => a.stock - b.stock);
    const low = inventory.filter(
      (a) =>
        a.status === "low" &&
        !dismissedIds.has(a.id) &&
        !inOtherOrder(a),
    );
    const dismissed = inventory
      .filter(
        (a) =>
          (a.status === "low" ||
            a.status === "critical" ||
            a.status === "out") &&
          dismissedIds.has(a.id) &&
          !inOtherOrder(a),
      )
      .sort((a, b) => a.stock - b.stock);
    // Items que están bajo umbral pero ya cubiertos por otra orden (info)
    const alreadyCovered = inventory
      .filter(
        (a) =>
          (a.status === "low" ||
            a.status === "critical" ||
            a.status === "out") &&
          inOtherOrder(a),
      )
      .sort((a, b) => a.stock - b.stock);
    return { critical, low, dismissed, alreadyCovered };
  }, [inventory, dismissedIds, activeOrderAssetIds]);

  const linesAssetIds = useMemo(
    () => new Set(lines.map((l) => l.assetId).filter(Boolean)),
    [lines],
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return inventory
      .filter((a) => {
        if (linesAssetIds.has(a.id)) return false;
        const hay = `${a.name} ${a.brand} ${a.sku} ${a.category}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 6);
  }, [inventory, search, linesAssetIds]);

  const linkedRequestIds = useMemo(() => {
    const ids = new Set<string>();
    for (const l of lines) {
      const reqId = requestIdFromLine(l);
      if (reqId) ids.add(reqId);
    }
    return ids;
  }, [lines]);

  const toggleRequestLine = (req: InternalRequest) => {
    setLines((prev) => {
      const exists = prev.some((l) => requestIdFromLine(l) === req.id);
      if (exists) {
        return prev.filter((l) => requestIdFromLine(l) !== req.id);
      }
      return [...prev, lineFromRequest(req)];
    });
  };

  const addAsset = (a: Asset, qty?: number) => {
    const suggested = Math.max(1, a.threshold - a.stock || 1);
    setLines((prev) => {
      const existing = prev.find((l) => l.assetId === a.id);
      if (existing) {
        return prev.map((l) =>
          l.assetId === a.id ? { ...l, qty: l.qty + (qty ?? 1) } : l,
        );
      }
      return [...prev, lineFromAsset(a, qty ?? suggested)];
    });
  };

  const addAdhoc = () => {
    if (!adhocName.trim()) {
      toast.error("Falta el nombre del item");
      return;
    }
    setLines((prev) => [
      ...prev,
      adhocLine(
        adhocName.trim(),
        adhocBrand.trim(),
        adhocCategory.trim(),
        Math.max(1, adhocQty),
      ),
    ]);
    setAdhocName("");
    setAdhocBrand("");
    setAdhocCategory("");
    setAdhocQty(1);
    setTimeout(
      () => linesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  };

  const addBulkCritical = () => {
    setLines((prev) => {
      const ids = new Set(prev.map((l) => l.assetId).filter(Boolean));
      const newOnes = suggestions.critical
        .filter((a) => !ids.has(a.id))
        .map((a) => lineFromAsset(a, Math.max(1, a.threshold - a.stock || a.threshold)));
      return [...prev, ...newOnes];
    });
    toast.success(`${suggestions.critical.length} items críticos agregados`);
  };

  const addBulkLow = () => {
    setLines((prev) => {
      const ids = new Set(prev.map((l) => l.assetId).filter(Boolean));
      const newOnes = suggestions.low
        .filter((a) => !ids.has(a.id))
        .map((a) => lineFromAsset(a, Math.max(1, a.threshold - a.stock || 1)));
      return [...prev, ...newOnes];
    });
    toast.success(`${suggestions.low.length} items bajos agregados`);
  };

  const updateLine = (id: string, qty: number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, qty: Math.max(1, qty) } : l)),
    );
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const editingMonthlyPlan = editing ? isMonthlyPlan(editing) : false;

  const persist = async (status: PurchaseOrderStatus) => {
    if (lines.length === 0) {
      toast.error("Agregá al menos un item antes de guardar");
      return;
    }
    const selectedRequestIds = Array.from(linkedRequestIds);
    let savedOrderId: string;

    // Si estamos editando el plan del mes: detectar líneas removidas y
    // marcar esos assets como dismissed (no se vuelven a auto-agregar).
    let dismissedCount = 0;
    if (editing && editingMonthlyPlan) {
      const originalAssetIds = new Set(
        editing.lines
          .map((l) => l.assetId)
          .filter((id): id is string => Boolean(id)),
      );
      const currentAssetIds = new Set(
        lines
          .map((l) => l.assetId)
          .filter((id): id is string => Boolean(id)),
      );
      for (const id of originalAssetIds) {
        if (!currentAssetIds.has(id)) {
          markDismissed(id);
          dismissedCount++;
        }
      }
    }

    const lineInputs = lines.map((l) => ({
      assetId: l.assetId ?? null,
      name: l.name,
      brand: l.brand,
      category: l.category,
      isNew: l.isNew,
      qty: l.qty,
    }));

    try {
      if (editing) {
        savedOrderId = editing.id;
        await updateOrderAction(editing.id, {
          lines: lineInputs,
          note: note.trim(),
          status,
          monthYear: null,
        });
        toast.success("Orden actualizada", {
          description: `${editing.reference} · ${lines.length} items`,
        });
      } else {
        const created = await createOrderAction({
          lines: lineInputs,
          note: note.trim(),
          status,
          monthYear: null,
        });
        savedOrderId = created.id;
        toast.success(
          status === "ready" ? "Orden lista para enviar" : "Borrador guardado",
          { description: `${created.reference} · ${lines.length} items` },
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("No se pudo guardar la orden");
      return;
    }

    const { linked, unlinked } = syncOrderRequestLinks(
      savedOrderId,
      selectedRequestIds,
    );
    if (linked > 0) {
      toast.info(
        `${linked} pedido${linked === 1 ? "" : "s"} vinculado${linked === 1 ? "" : "s"} a esta orden`,
      );
    }
    if (unlinked > 0) {
      toast.info(
        `${unlinked} pedido${unlinked === 1 ? "" : "s"} volvieron a pendiente`,
      );
    }
    if (dismissedCount > 0) {
      toast.info(
        `${dismissedCount} ${dismissedCount === 1 ? "item excluido" : "items excluidos"} del plan automático`,
        {
          description:
            "No se van a auto-agregar más, pero podés reactivarlos desde Sugerencias.",
        },
      );
    }

    onClose();
  };

  const totalLines = lines.length;
  const total = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <>
      <DialogHeader className="gap-1 border-b border-border/70 bg-gradient-to-b from-card/60 to-card/0 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate text-[16px] font-semibold tracking-tight">
                {editingMonthlyPlan
                  ? `Plan de compras · ${editing!.reference}`
                  : editing
                    ? `Editar orden · ${editing.reference}`
                    : "Nueva orden de compra"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[12.5px]">
                {editingMonthlyPlan
                  ? "Si sacás un item de acá, no se va a volver a sumar automáticamente al plan del mes que viene."
                  : "Sumá items desde sugerencias, buscando en el catálogo o creando uno nuevo. Al recibir la orden se actualiza el inventario."}
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-1 -mt-1 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1.1fr_1fr]">
          {/* Picker (tabs) → derecha en desktop */}
          <div className="flex min-h-0 flex-col overflow-hidden border-b border-border/60 md:order-2 md:border-b-0">
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(String(v))}
              className="flex min-h-0 flex-1 flex-col gap-0"
            >
              <div className="border-b border-border/60 px-5 pt-4 sm:px-6">
                <TabsList className="h-10 w-full">
                  <TabsTrigger value="requests" className="gap-2">
                    <Inbox className="size-3.5" />
                    Pedidos
                    {openRequests.filter((r) => r.status === "pending").length >
                      0 && (
                      <span className="rounded-full bg-status-low-soft px-1.5 py-0.5 text-[10px] font-bold leading-none text-status-low tabular-nums">
                        {openRequests.filter((r) => r.status === "pending").length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="suggestions" className="gap-2">
                    <Sparkles className="size-3.5" />
                    Sugerencias
                    {suggestions.critical.length + suggestions.low.length > 0 && (
                      <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary tabular-nums">
                        {suggestions.critical.length + suggestions.low.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="search" className="gap-2">
                    <Search className="size-3.5" />
                    Catálogo
                  </TabsTrigger>
                  <TabsTrigger value="adhoc" className="gap-2">
                    <PackagePlus className="size-3.5" />
                    Nuevo
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                <TabsContent value="requests" className="m-0 outline-none">
                  {openRequests.length === 0 ? (
                    <div className="grid place-items-center rounded-xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10">
                      <div className="flex flex-col items-center gap-2">
                        <span className="grid size-10 place-items-center rounded-full bg-muted/60 text-muted-foreground ring-1 ring-foreground/5">
                          <Inbox className="size-4" />
                        </span>
                        <p className="text-[12.5px] font-medium text-foreground/80">
                          Sin pedidos pendientes
                        </p>
                        <p className="max-w-[30ch] text-[12px] text-muted-foreground">
                          Cuando alguien del equipo haga un pedido que no tengas
                          en stock, aparecerá acá para sumarlo.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {openRequests.map((r) => {
                        const linked = linkedRequestIds.has(r.id);
                        const inOrder = r.assetId
                          ? findActiveOrderForAsset(r.assetId, editing?.id)
                          : undefined;
                        return (
                          <li
                            key={r.id}
                            className={cn(
                              "flex flex-col gap-2 rounded-xl bg-card px-4 py-3 ring-1 transition-colors",
                              linked
                                ? "ring-primary/40"
                                : "ring-foreground/10 hover:bg-muted/20",
                            )}
                          >
                            <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground">
                                  {r.reference}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium ring-1",
                                    PRIORITY_TONE[r.priority],
                                  )}
                                >
                                  {PRIORITY_LABEL[r.priority]}
                                </span>
                              </div>
                              <p className="mt-1 truncate text-[13px]">
                                <span className="font-semibold">
                                  {r.requesterName}
                                </span>{" "}
                                <span className="text-muted-foreground">·</span>{" "}
                                <span className="font-semibold tabular-nums">
                                  {r.qty}
                                </span>{" "}
                                <span className="text-muted-foreground">×</span>{" "}
                                <span className="font-medium">{r.itemName}</span>
                              </p>
                              <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                                {r.brand || "—"} · {r.category || "Otros"}
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="xs"
                              variant={linked ? "default" : "outline"}
                              onClick={() => toggleRequestLine(r)}
                            >
                              {linked ? (
                                <>
                                  <Check className="size-3" />
                                  Sumado
                                </>
                              ) : (
                                <>
                                  <Plus className="size-3" />
                                  Sumar
                                </>
                              )}
                            </Button>
                            </div>
                            {inOrder && (
                              <div className="inline-flex flex-wrap items-center gap-1.5 text-[10.5px]">
                                <span className="inline-flex items-center gap-1 rounded-full bg-status-info-soft px-2 py-0.5 font-semibold text-status-info ring-1 ring-status-info/30">
                                  <span className="size-1 rounded-full bg-status-info" />
                                  Item ya pedido en{" "}
                                  <span className="font-mono font-bold">
                                    {inOrder.reference}
                                  </span>
                                </span>
                                <span className="text-muted-foreground">
                                  × {inOrder.qty} · {inOrder.monthYear}
                                </span>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </TabsContent>

                <TabsContent value="suggestions" className="m-0 outline-none">
                  {suggestions.critical.length === 0 &&
                  suggestions.low.length === 0 &&
                  suggestions.dismissed.length === 0 ? (
                    <div className="flex flex-col gap-3">
                      <div className="grid place-items-center rounded-xl bg-card px-6 py-10 text-center ring-1 ring-foreground/10">
                        <div className="flex flex-col items-center gap-2">
                          <span className="grid size-10 place-items-center rounded-full bg-status-healthy-soft text-status-healthy ring-1 ring-foreground/5">
                            <Sparkles className="size-4" />
                          </span>
                          <p className="text-[13px] font-semibold text-foreground/90">
                            Nada más para sugerir
                          </p>
                          <p className="max-w-[36ch] text-[12px] text-muted-foreground">
                            {suggestions.alreadyCovered.length > 0
                              ? `Los items bajo umbral ya están cubiertos por órdenes activas del mes. Para sumar algo extra, usá Catálogo o Nuevo.`
                              : "Todo el inventario está por encima del umbral mínimo."}
                          </p>
                        </div>
                      </div>

                      {suggestions.alreadyCovered.length > 0 && (
                        <AlreadyCoveredSection
                          items={suggestions.alreadyCovered}
                          editingOrderId={editing?.id}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {suggestions.critical.length > 0 && (
                        <SuggestionGroup
                          icon={
                            <AlertOctagon className="size-3.5 text-status-critical" />
                          }
                          title="Críticos / Agotados"
                          count={suggestions.critical.length}
                          items={suggestions.critical}
                          onAdd={(a) => addAsset(a)}
                          onAddAll={addBulkCritical}
                          existingIds={linesAssetIds}
                          excludeOrderId={editing?.id}
                        />
                      )}
                      {suggestions.low.length > 0 && (
                        <SuggestionGroup
                          icon={<AlertTriangle className="size-3.5 text-status-low" />}
                          title="Bajo umbral"
                          count={suggestions.low.length}
                          items={suggestions.low}
                          onAdd={(a) => addAsset(a)}
                          onAddAll={addBulkLow}
                          existingIds={linesAssetIds}
                          excludeOrderId={editing?.id}
                        />
                      )}
                      {suggestions.dismissed.length > 0 && (
                        <DismissedSuggestionGroup
                          items={suggestions.dismissed}
                          existingIds={linesAssetIds}
                          excludeOrderId={editing?.id}
                          onAdd={(a) => addAsset(a)}
                          onReactivate={(a) => {
                            markUndismissed(a.id);
                            setDismissedIds(loadDismissed());
                            toast.success(
                              "Reactivado en el plan automático",
                              {
                                description: `${a.name} va a volver a aparecer solo cuando esté bajo umbral.`,
                              },
                            );
                          }}
                        />
                      )}
                      {suggestions.alreadyCovered.length > 0 && (
                        <AlreadyCoveredSection
                          items={suggestions.alreadyCovered}
                          editingOrderId={editing?.id}
                        />
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="search" className="m-0 flex flex-col gap-3 outline-none">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por nombre, marca o código…"
                      className="h-11 pl-9"
                      autoFocus
                    />
                  </div>
                  {search.trim() ? (
                    <div className="rounded-xl bg-card ring-1 ring-foreground/10">
                      {searchResults.length === 0 ? (
                        <div className="px-4 py-6 text-center text-[12.5px] text-muted-foreground">
                          Sin resultados para “{search.trim()}”. Probá la pestaña{" "}
                          <button
                            type="button"
                            onClick={() => setTab("adhoc")}
                            className="font-semibold text-primary hover:underline"
                          >
                            Nuevo
                          </button>{" "}
                          para crearlo.
                        </div>
                      ) : (
                        <ul className="divide-y divide-border/50">
                          {searchResults.map((a) => (
                            <li
                              key={a.id}
                              className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/30"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-medium">
                                  {a.name}
                                </div>
                                <div className="truncate text-[11.5px] text-muted-foreground">
                                  {a.brand || "—"} · {a.category} · Stock {a.stock}
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  addAsset(a);
                                  setSearch("");
                                }}
                              >
                                <Plus className="size-3" />
                                Agregar
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="grid place-items-center rounded-xl bg-card px-6 py-10 text-center ring-1 ring-foreground/10">
                      <div className="flex flex-col items-center gap-2">
                        <span className="grid size-10 place-items-center rounded-full bg-muted/60 text-muted-foreground ring-1 ring-foreground/5">
                          <Search className="size-4" />
                        </span>
                        <p className="text-[12.5px] font-medium text-foreground/80">
                          Buscá del catálogo
                        </p>
                        <p className="max-w-[30ch] text-[12px] text-muted-foreground">
                          Escribí nombre, marca o código para encontrar items que ya compraste.
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="adhoc" className="m-0 outline-none">
                  <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
                    <div className="mb-4 flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20">
                        <PackagePlus className="size-[18px]" />
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold leading-tight">
                          Agregar item nuevo
                        </span>
                        <span className="text-[11.5px] font-medium text-muted-foreground leading-tight">
                          Para items que aún no están en el catálogo.
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <div className="grid gap-1.5 sm:col-span-2">
                        <Label htmlFor="adhoc-name" className="text-[12.5px] font-medium text-foreground">
                          Nombre <span className="text-status-critical">*</span>
                        </Label>
                        <Input
                          id="adhoc-name"
                          value={adhocName}
                          onChange={(e) => setAdhocName(e.target.value)}
                          placeholder="ej. Soporte para monitor doble"
                          className="h-10"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="adhoc-brand" className="text-[12.5px] font-medium text-foreground">
                          Marca
                        </Label>
                        <Input
                          id="adhoc-brand"
                          value={adhocBrand}
                          onChange={(e) => setAdhocBrand(e.target.value)}
                          placeholder="ej. VonHaus"
                          className="h-10"
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="adhoc-cat" className="text-[12.5px] font-medium text-foreground">
                          Categoría
                        </Label>
                        <Input
                          id="adhoc-cat"
                          value={adhocCategory}
                          onChange={(e) => setAdhocCategory(e.target.value)}
                          placeholder="ej. Accesorio"
                          className="h-10"
                        />
                      </div>
                      <div className="grid gap-1.5 sm:col-span-2">
                        <Label htmlFor="adhoc-qty" className="text-[12.5px] font-medium text-foreground">
                          Cantidad <span className="text-status-critical">*</span>
                        </Label>
                        <NumberInput
                          id="adhoc-qty"
                          min={1}
                          fallback={1}
                          value={adhocQty}
                          onChange={setAdhocQty}
                          className="h-10 w-28 font-mono tabular-nums"
                        />
                      </div>
                      <div className="flex justify-end pt-1 sm:col-span-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={addAdhoc}
                          className="w-full sm:w-auto"
                        >
                          <Plus className="size-3.5" />
                          Agregar a la orden
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Cart (items de la orden + nota) → izquierda en desktop, dominante */}
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden bg-muted/15 p-5 sm:p-6 md:order-1 md:border-r md:border-border/60">
          {/* Lines */}
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20">
                  <ShoppingCart className="size-[18px]" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold leading-tight">
                    Items de la orden
                  </span>
                  <span className="truncate text-[11.5px] font-medium text-muted-foreground leading-tight tabular-nums">
                    {totalLines === 0
                      ? "Carrito vacío"
                      : `${totalLines} ${totalLines === 1 ? "línea" : "líneas"} · ${total} ${total === 1 ? "unidad" : "unidades"}`}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {lines.length > 0 && (
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() => setLines([])}
                    className="text-muted-foreground hover:text-status-critical"
                  >
                    Vaciar
                  </Button>
                )}
              </div>
            </div>
            {lines.length === 0 ? (
              <div className="grid flex-1 place-items-center px-6 py-10 text-center">
                <div className="flex flex-col items-center gap-2.5">
                  <span className="grid size-12 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/30">
                    <Plus className="size-5" />
                  </span>
                  <p className="text-[14px] font-semibold text-foreground/90">
                    Tu orden está vacía
                  </p>
                  <p className="max-w-[30ch] text-[12.5px] text-muted-foreground">
                    Elegí items desde las pestañas{" "}
                    <span className="font-semibold text-foreground/80">
                      Pedidos / Sugerencias / Catálogo / Nuevo
                    </span>{" "}
                    a la derecha para empezar.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="flex-1 divide-y divide-border/40 overflow-y-auto">
                <AnimatePresence initial={false}>
                  {lines.map((l) => (
                    <motion.li
                      key={l.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-medium">
                            {l.name}
                          </span>
                          {l.isNew && (
                            <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-primary">
                              nuevo
                            </span>
                          )}
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {l.brand || "—"} · {l.category}
                        </div>
                      </div>
                      <NumberInput
                        min={1}
                        fallback={1}
                        value={l.qty}
                        onChange={(n) => updateLine(l.id, n)}
                        className="h-8 w-16 text-center font-mono tabular-nums sm:w-20"
                      />
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => removeLine(l.id)}
                        className="text-muted-foreground hover:bg-status-critical/15 hover:text-status-critical"
                        aria-label="Quitar"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </motion.li>
                  ))}
                </AnimatePresence>
                <li ref={linesEndRef} aria-hidden />
              </ul>
            )}
          </section>

          {/* Note */}
          <section className="flex shrink-0 flex-col gap-1.5">
            <Label htmlFor="note" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Nota interna <span className="font-normal normal-case tracking-normal text-muted-foreground/70">(opcional)</span>
            </Label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ej. Pedir cotización a 3 proveedores antes de aprobar"
              rows={2}
              className="resize-none rounded-md border border-input bg-input/30 px-3 py-2 text-[13px] outline-none transition-colors hover:bg-input/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </section>
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/30 px-5 py-3 sm:px-6">
          <div className="text-[12px] text-muted-foreground">
            {totalLines === 0 ? (
              <span className="font-medium text-status-low">
                Agregá al menos un item desde la derecha para guardar
              </span>
            ) : (
              <>
                {totalLines} {totalLines === 1 ? "item" : "items"} · {total}{" "}
                {total === 1 ? "unidad" : "unidades"}
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={totalLines === 0}
              onClick={() => persist("draft")}
            >
              Guardar borrador
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={totalLines === 0}
              onClick={() => persist("ready")}
            >
              <Send className="size-3.5" />
              Marcar como lista
            </Button>
          </div>
        </footer>
    </>
  );
}

function SuggestionGroup({
  icon,
  title,
  count,
  items,
  onAdd,
  onAddAll,
  existingIds,
  excludeOrderId,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  items: Asset[];
  onAdd: (a: Asset) => void;
  onAddAll: () => void;
  existingIds: Set<string | undefined>;
  excludeOrderId?: string;
}) {
  return (
    <div className="rounded-lg bg-background/60 ring-1 ring-foreground/[0.05]">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}
          {title}
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground tabular-nums">
            {count}
          </span>
        </div>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={onAddAll}
          className="text-primary hover:text-primary/80"
        >
          Agregar todos
        </Button>
      </div>
      <ul className="divide-y divide-border/30">
        {items.slice(0, 6).map((a) => {
          const existing = existingIds.has(a.id);
          const suggested = Math.max(1, a.threshold - a.stock || a.threshold);
          const inOrder = findActiveOrderForAsset(a.id, excludeOrderId);
          return (
            <li
              key={a.id}
              className={cn(
                "flex flex-col gap-1.5 px-3 py-2",
                existing && "opacity-50",
              )}
            >
              <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-medium">
                  {a.name}
                </div>
                <div className="truncate text-[11px] text-muted-foreground">
                  Stock {a.stock} / mín. {a.threshold} · sugerido: {suggested}
                </div>
              </div>
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={existing}
                onClick={() => onAdd(a)}
              >
                {existing ? "Agregado" : (
                  <>
                    <Plus className="size-3" /> Sumar
                  </>
                )}
              </Button>
              </div>
              {inOrder && (
                <div className="inline-flex flex-wrap items-center gap-1.5 text-[10.5px]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-info-soft px-1.5 py-0.5 font-semibold text-status-info ring-1 ring-status-info/30">
                    <span className="size-1 rounded-full bg-status-info" />
                    Ya pedido en{" "}
                    <span className="font-mono font-bold">
                      {inOrder.reference}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    × {inOrder.qty} · {inOrder.monthYear}
                  </span>
                </div>
              )}
            </li>
          );
        })}
        {items.length > 6 && (
          <li className="px-3 py-1.5 text-[11px] text-muted-foreground">
            +{items.length - 6} más — usá &quot;Agregar todos&quot; o buscá
            arriba.
          </li>
        )}
      </ul>
    </div>
  );
}

function AlreadyCoveredSection({
  items,
  editingOrderId,
}: {
  items: Asset[];
  editingOrderId?: string;
}) {
  return (
    <div className="rounded-lg bg-card/60 px-3 py-3 ring-1 ring-foreground/10">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="size-1.5 rounded-full bg-status-info" />
        Ya cubierto por otras órdenes
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground tabular-nums">
          {items.length}
        </span>
      </div>
      <p className="mb-2 text-[11px] text-muted-foreground">
        Items bajo umbral que ya forman parte de otras órdenes activas — no
        hace falta volver a pedirlos.
      </p>
      <ul className="grid gap-1">
        {items.slice(0, 8).map((a) => {
          const inOrder = findActiveOrderForAsset(a.id, editingOrderId);
          return (
            <li
              key={a.id}
              className="flex flex-col gap-0.5 rounded-md px-2 py-1.5"
            >
              <div className="flex items-center gap-2 text-[12.5px]">
                <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                <span className="truncate font-medium">{a.name}</span>
                <span className="truncate text-[11px] text-muted-foreground">
                  · stock {a.stock} / mín. {a.threshold}
                </span>
              </div>
              {inOrder && (
                <div className="ml-3.5 text-[10.5px] text-muted-foreground">
                  <span className="font-mono font-semibold text-status-info">
                    {inOrder.reference}
                  </span>{" "}
                  · × {inOrder.qty}
                </div>
              )}
            </li>
          );
        })}
        {items.length > 8 && (
          <li className="px-2 pt-1 text-[11px] italic text-muted-foreground">
            + {items.length - 8} más
          </li>
        )}
      </ul>
    </div>
  );
}

function DismissedSuggestionGroup({
  items,
  existingIds,
  onAdd,
  onReactivate,
  excludeOrderId,
}: {
  items: Asset[];
  existingIds: Set<string | undefined>;
  onAdd: (a: Asset) => void;
  onReactivate: (a: Asset) => void;
  excludeOrderId?: string;
}) {
  return (
    <div className="rounded-lg bg-background/60 ring-1 ring-foreground/[0.05]">
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span className="grid size-3.5 place-items-center rounded-full bg-muted text-muted-foreground">
            ⊘
          </span>
          Excluidos del plan automático
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground tabular-nums">
            {items.length}
          </span>
        </div>
      </div>
      <div className="border-t border-border/30 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
        Items bajo umbral que sacaste de planes anteriores. No se van a
        auto-agregar más. Podés sumarlos esta vez o reactivarlos para que
        vuelvan al plan automático el mes que viene.
      </div>
      <ul className="divide-y divide-border/30">
        {items.slice(0, 6).map((a) => {
          const existing = existingIds.has(a.id);
          const inOrder = findActiveOrderForAsset(a.id, excludeOrderId);
          return (
            <li
              key={a.id}
              className={cn(
                "flex flex-col gap-1.5 px-3 py-2",
                existing && "opacity-50",
              )}
            >
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-medium">
                      {a.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">
                      excluido
                    </span>
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    Stock {a.stock} / mín. {a.threshold}
                  </div>
                </div>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => onReactivate(a)}
                  className="text-primary hover:text-primary/80"
                >
                  Reactivar
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={existing}
                  onClick={() => onAdd(a)}
                >
                  {existing ? (
                    "Agregado"
                  ) : (
                    <>
                      <Plus className="size-3" /> Sumar
                    </>
                  )}
                </Button>
              </div>
              {inOrder && (
                <div className="inline-flex flex-wrap items-center gap-1.5 text-[10.5px]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-info-soft px-1.5 py-0.5 font-semibold text-status-info ring-1 ring-status-info/30">
                    <span className="size-1 rounded-full bg-status-info" />
                    Ya pedido en{" "}
                    <span className="font-mono font-bold">
                      {inOrder.reference}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    × {inOrder.qty} · {inOrder.monthYear}
                  </span>
                </div>
              )}
            </li>
          );
        })}
        {items.length > 6 && (
          <li className="px-3 py-1.5 text-[11px] text-muted-foreground">
            +{items.length - 6} más.
          </li>
        )}
      </ul>
    </div>
  );
}
