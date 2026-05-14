"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Package,
  PackagePlus,
  Search,
  X,
} from "lucide-react";
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
import type { Asset, Priority } from "@/lib/fake-data";
import { loadInventory } from "@/lib/storage";

import {
  loadRequests,
  nextRequestRef,
  saveRequests,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  type InternalRequest,
} from "../lib/requests";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing?: InternalRequest | null;
};

type ItemSource = "catalog" | "adhoc";

const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

export function NewRequestDialog({ open, onOpenChange, editing }: Props) {
  const [inventory, setInventory] = useState<Asset[]>([]);

  const [requesterName, setRequesterName] = useState("");
  const [requesterTeam, setRequesterTeam] = useState("");

  const [source, setSource] = useState<ItemSource>("catalog");
  const [search, setSearch] = useState("");
  const [pickedAsset, setPickedAsset] = useState<Asset | null>(null);

  const [adhocName, setAdhocName] = useState("");
  const [adhocBrand, setAdhocBrand] = useState("");
  const [adhocCategory, setAdhocCategory] = useState("");

  const [qty, setQty] = useState(1);
  const [priority, setPriority] = useState<Priority>("medium");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setInventory(loadInventory() ?? []);
    if (editing) {
      setRequesterName(editing.requesterName);
      setRequesterTeam(editing.requesterTeam);
      if (editing.assetId) {
        setSource("catalog");
        const asset = (loadInventory() ?? []).find(
          (a) => a.id === editing.assetId,
        );
        setPickedAsset(asset ?? null);
        setSearch(asset?.name ?? editing.itemName);
        setAdhocName("");
        setAdhocBrand("");
        setAdhocCategory("");
      } else {
        setSource("adhoc");
        setPickedAsset(null);
        setSearch("");
        setAdhocName(editing.itemName);
        setAdhocBrand(editing.brand);
        setAdhocCategory(editing.category);
      }
      setQty(editing.qty);
      setPriority(editing.priority);
      setReason(editing.reason);
    } else {
      setRequesterName("");
      setRequesterTeam("");
      setSource("catalog");
      setSearch("");
      setPickedAsset(null);
      setAdhocName("");
      setAdhocBrand("");
      setAdhocCategory("");
      setQty(1);
      setPriority("medium");
      setReason("");
    }
  }, [open, editing]);

  const catalogResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? inventory.filter((a) => {
          const hay = `${a.name} ${a.brand} ${a.sku} ${a.category}`.toLowerCase();
          return hay.includes(q);
        })
      : inventory.slice();
    // Healthy primero (puede entregarse ya), luego low, luego critical/out
    const rank = (s: Asset["status"]) =>
      s === "healthy" ? 0 : s === "low" ? 1 : s === "critical" ? 2 : 3;
    return filtered
      .sort((a, b) => rank(a.status) - rank(b.status) || a.name.localeCompare(b.name))
      .slice(0, 30);
  }, [inventory, search]);

  const stockTone = (status: Asset["status"]) =>
    status === "healthy"
      ? "bg-status-healthy-soft text-status-healthy ring-status-healthy/30"
      : status === "low"
        ? "bg-status-low-soft text-status-low ring-status-low/30"
        : "bg-status-critical-soft text-status-critical ring-status-critical/30";

  const submit = () => {
    if (!requesterName.trim()) {
      toast.error("Falta el nombre del solicitante");
      return;
    }
    if (source === "catalog" && !pickedAsset) {
      toast.error("Elegí un item del catálogo o cambiá a “Nuevo”");
      return;
    }
    if (source === "adhoc" && !adhocName.trim()) {
      toast.error("Falta el nombre del item");
      return;
    }
    if (qty < 1) {
      toast.error("La cantidad tiene que ser al menos 1");
      return;
    }

    const existing = loadRequests();
    const now = new Date();

    if (editing) {
      const next = existing.map((r) =>
        r.id === editing.id
          ? {
              ...r,
              requesterName: requesterName.trim(),
              requesterTeam: requesterTeam.trim(),
              itemName:
                source === "catalog" ? pickedAsset!.name : adhocName.trim(),
              assetId: source === "catalog" ? pickedAsset!.id : undefined,
              brand:
                source === "catalog"
                  ? pickedAsset!.brand
                  : adhocBrand.trim(),
              category:
                source === "catalog"
                  ? pickedAsset!.category
                  : adhocCategory.trim(),
              qty,
              priority,
              reason: reason.trim(),
            }
          : r,
      );
      saveRequests(next);
      toast.success("Pedido actualizado", { description: editing.reference });
    } else {
      const reference = nextRequestRef(existing);
      const req: InternalRequest = {
        id: `req_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        reference,
        requesterName: requesterName.trim(),
        requesterTeam: requesterTeam.trim(),
        itemName:
          source === "catalog" ? pickedAsset!.name : adhocName.trim(),
        assetId: source === "catalog" ? pickedAsset!.id : undefined,
        brand:
          source === "catalog" ? pickedAsset!.brand : adhocBrand.trim(),
        category:
          source === "catalog"
            ? pickedAsset!.category
            : adhocCategory.trim() || "Otros",
        qty,
        priority,
        reason: reason.trim(),
        status: "pending",
        createdAt: now,
      };
      saveRequests([req, ...existing]);
      toast.success("Pedido creado", {
        description: `${reference} · ${req.qty} × ${req.itemName}`,
      });
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100svh-2rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="gap-1 border-b border-border/70 bg-gradient-to-b from-card/60 to-card/0 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="truncate text-[16px] font-semibold tracking-tight">
                {editing ? `Editar pedido · ${editing.reference}` : "Nuevo pedido"}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[12.5px]">
                Registrá un pedido de alguien de la empresa. Si no hay stock se
                sumará a la compra del mes.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar"
              className="-mr-1 -mt-1 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5 overflow-y-auto p-5 sm:p-6">
          {/* Solicitante */}
          <section className="grid gap-3.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label
                htmlFor="req-name"
                className="!gap-1 text-[12.5px] font-medium text-foreground"
              >
                <span>
                  Solicitante
                  <span className="ml-0.5 text-status-critical">*</span>
                </span>
              </Label>
              <Input
                id="req-name"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="ej. Florencia Acosta"
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="req-team" className="text-[12.5px] font-medium text-foreground">
                Equipo / Área
              </Label>
              <Input
                id="req-team"
                value={requesterTeam}
                onChange={(e) => setRequesterTeam(e.target.value)}
                placeholder="ej. Atención al paciente"
                className="h-10"
              />
            </div>
          </section>

          {/* Item solicitado */}
          <section className="flex flex-col gap-2">
            <Label className="!gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              <span>
                Item solicitado
                <span className="ml-0.5 text-status-critical">*</span>
              </span>
            </Label>

            <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
              <Tabs
                value={source}
                onValueChange={(v) => {
                  setSource(String(v) as ItemSource);
                  setPickedAsset(null);
                  setSearch("");
                }}
                className="flex flex-col gap-0"
              >
                <TabsList className="mb-3 h-9 w-full">
                  <TabsTrigger value="catalog" className="gap-2">
                    <Search className="size-3.5" />
                    Del catálogo
                  </TabsTrigger>
                  <TabsTrigger value="adhoc" className="gap-2">
                    <PackagePlus className="size-3.5" />
                    Nuevo item
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="catalog" className="m-0 outline-none">
                  {pickedAsset ? (
                    <SelectedAsset
                      asset={pickedAsset}
                      qty={qty}
                      onChange={() => {
                        setPickedAsset(null);
                        setSearch("");
                      }}
                      stockTone={stockTone}
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Buscar por nombre, marca o código…"
                          className="h-10 pl-9"
                        />
                      </div>

                      {inventory.length === 0 ? (
                        <EmptyHint>
                          No hay items en el inventario todavía.
                        </EmptyHint>
                      ) : catalogResults.length === 0 ? (
                        <EmptyHint>
                          Sin resultados para “{search.trim()}”. Probá la pestaña{" "}
                          <button
                            type="button"
                            onClick={() => setSource("adhoc")}
                            className="font-semibold text-primary hover:underline"
                          >
                            Nuevo item
                          </button>
                          .
                        </EmptyHint>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                            <span>
                              {search.trim()
                                ? `${catalogResults.length} resultado${catalogResults.length === 1 ? "" : "s"}`
                                : "Disponibles primero"}
                            </span>
                            <span>Stock</span>
                          </div>
                          <ul className="max-h-[260px] divide-y divide-border/50 overflow-y-auto rounded-lg bg-background/40 ring-1 ring-foreground/10">
                            {catalogResults.map((a) => (
                              <li key={a.id}>
                                <button
                                  type="button"
                                  onClick={() => setPickedAsset(a)}
                                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
                                >
                                  <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted/60 text-muted-foreground ring-1 ring-foreground/10">
                                    <Package className="size-4" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-[13px] font-medium">
                                      {a.name}
                                    </div>
                                    <div className="truncate text-[11.5px] text-muted-foreground">
                                      {a.brand || "—"} · {a.category}
                                    </div>
                                  </div>
                                  <span
                                    className={cn(
                                      "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1",
                                      stockTone(a.status),
                                    )}
                                    title={`Stock actual: ${a.stock} · mínimo ${a.threshold}`}
                                  >
                                    <span className="size-1.5 rounded-full bg-current opacity-80" />
                                    {a.stock}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="adhoc" className="m-0 outline-none">
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <div className="grid gap-1.5 sm:col-span-2">
                      <Label
                        htmlFor="adhoc-req-name"
                        className="!gap-1 text-[12.5px] font-medium text-foreground"
                      >
                        <span>
                          Nombre del item
                          <span className="ml-0.5 text-status-critical">*</span>
                        </span>
                      </Label>
                      <Input
                        id="adhoc-req-name"
                        value={adhocName}
                        onChange={(e) => setAdhocName(e.target.value)}
                        placeholder="ej. Adaptador USB-C a HDMI"
                        className="h-10"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="adhoc-req-brand"
                        className="text-[12.5px] font-medium text-foreground"
                      >
                        Marca
                      </Label>
                      <Input
                        id="adhoc-req-brand"
                        value={adhocBrand}
                        onChange={(e) => setAdhocBrand(e.target.value)}
                        placeholder="ej. Anker"
                        className="h-10"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label
                        htmlFor="adhoc-req-cat"
                        className="text-[12.5px] font-medium text-foreground"
                      >
                        Categoría
                      </Label>
                      <Input
                        id="adhoc-req-cat"
                        value={adhocCategory}
                        onChange={(e) => setAdhocCategory(e.target.value)}
                        placeholder="ej. Accesorio"
                        className="h-10"
                      />
                    </div>
                    <p className="text-[11.5px] text-muted-foreground sm:col-span-2">
                      Este item se sumará a la próxima compra del mes al aprobar
                      el pedido.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </section>

          {/* Cantidad + Prioridad */}
          <section className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
            <div className="flex w-32 shrink-0 flex-col gap-1.5">
              <Label
                htmlFor="req-qty"
                className="!gap-1 text-[12.5px] font-medium text-foreground"
              >
                <span>
                  Cantidad
                  <span className="ml-0.5 text-status-critical">*</span>
                </span>
              </Label>
              <NumberInput
                id="req-qty"
                min={1}
                fallback={1}
                value={qty}
                onChange={setQty}
                className="h-10 text-center font-mono tabular-nums"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label className="text-[12.5px] font-medium text-foreground">
                Prioridad
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[11.5px] font-medium ring-1 transition-colors",
                      priority === p
                        ? PRIORITY_TONE[p]
                        : "bg-muted/40 text-muted-foreground ring-foreground/10 hover:bg-muted/60",
                    )}
                  >
                    {PRIORITY_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-1.5">
            <Label htmlFor="req-reason" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Motivo <span className="font-normal normal-case tracking-normal text-muted-foreground/70">(opcional)</span>
            </Label>
            <textarea
              id="req-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ej. Su equipo actual quedó sin stock de un repuesto crítico"
              rows={2}
              className="resize-none rounded-md border border-input bg-input/30 px-3 py-2 text-[13px] outline-none transition-colors hover:bg-input/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 bg-muted/30 px-5 py-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={submit}>
            {editing ? "Guardar cambios" : "Crear pedido"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-background/40 px-4 py-6 text-center text-[12px] text-muted-foreground ring-1 ring-foreground/10">
      {children}
    </div>
  );
}

function SelectedAsset({
  asset,
  qty,
  onChange,
  stockTone,
}: {
  asset: Asset;
  qty: number;
  onChange: () => void;
  stockTone: (s: Asset["status"]) => string;
}) {
  const enough = asset.stock >= qty;
  const missing = Math.max(0, qty - asset.stock);

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-background/40 p-3 ring-1 ring-primary/30 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20">
          <Package className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-semibold leading-tight">
            {asset.name}
          </div>
          <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {asset.brand || "—"} · {asset.category}
          </div>
        </div>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={onChange}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          Cambiar
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-[12px]">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold tabular-nums ring-1",
            stockTone(asset.status),
          )}
        >
          <span className="size-1.5 rounded-full bg-current opacity-80" />
          {asset.stock} en stock
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          Pedido:{" "}
          <span className="font-semibold tabular-nums text-foreground/80">
            {qty}
          </span>
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          {enough ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-healthy-soft px-2 py-1 text-[11px] font-semibold text-status-healthy ring-1 ring-status-healthy/30">
              <Check className="size-3" />
              Stock alcanza · se entrega
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-low-soft px-2 py-1 text-[11px] font-semibold text-status-low ring-1 ring-status-low/30">
              <AlertTriangle className="size-3" />
              Faltan {missing} · irá a la compra
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
