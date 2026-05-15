"use client";

import { useEffect, useMemo, useState } from "react";
import { ListChecks, Mail, Plus, Send, Settings2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getLocations,
  statusFromStock,
  type Asset,
} from "@/lib/fake-data";
import { loadInventory, subscribeInventory } from "@/lib/storage";
import {
  isMonthlyPlan,
  type PurchaseOrder,
} from "@/features/procurement/lib/orders";
import {
  loadOrders,
  subscribeOrders,
} from "@/features/procurement/lib/orders-storage";
import type { InternalRequest } from "@/features/requests/lib/requests";
import {
  loadRequests,
  subscribeRequests,
} from "@/features/requests/lib/requests-storage";
import { renderMonthlyReport } from "@/features/emails/monthly-report-template";
import { sendEmail } from "@/features/emails/send-email";
import {
  clearExclusions,
  loadConfig,
  loadExclusions,
  markSentThisMonth,
  saveConfig,
  subscribeConfig,
  subscribeExclusions,
  toggleExclusion,
  type ReportConfig,
  type SectionToggles,
} from "../lib/report-config";
import {
  buildReportExcelBase64,
  reportExcelFilename,
} from "../lib/build-report-excel";
import { ExclusionDrawer, type ExclusionItem } from "./exclusion-drawer";

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

type SectionKey = keyof SectionToggles;

const SECTIONS: { key: SectionKey; label: string; description: string }[] = [
  {
    key: "inventory",
    label: "Items bajo umbral",
    description: "Stock crítico, agotado o bajo en el inventario",
  },
  {
    key: "plan",
    label: "Plan de compras del mes",
    description: "Items que vas a comprar este mes",
  },
  {
    key: "readyOrders",
    label: "Órdenes listas para enviar",
    description: "Otras compras armadas además del plan",
  },
  {
    key: "pendingRequests",
    label: "Pedidos del equipo sin resolver",
    description: "Pedidos pendientes + esperando compra",
  },
];

export function ReportBuilder() {
  const [config, setConfig] = useState<ReportConfig>(loadConfig());
  const [exclusions, setExclusions] = useState<Set<string>>(new Set());
  const [inventory, setInventory] = useState<Asset[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [recipientDraft, setRecipientDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [drawer, setDrawer] = useState<SectionKey | null>(null);

  const locations = useMemo(() => getLocations(), []);

  useEffect(() => {
    const refresh = () => {
      setConfig(loadConfig());
      setExclusions(loadExclusions());
      setInventory(loadInventory() ?? []);
      setOrders(loadOrders());
      setRequests(loadRequests());
    };
    refresh();
    const u1 = subscribeConfig(refresh);
    const u2 = subscribeExclusions(refresh);
    const u3 = subscribeInventory(refresh);
    const u4 = subscribeOrders(refresh);
    const u5 = subscribeRequests(refresh);
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
    };
  }, []);

  const monthLabel = useMemo(() => {
    const now = new Date();
    return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`.replace(/^./, (c) =>
      c.toUpperCase(),
    );
  }, []);

  const appUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  // ─── Derivación de qué entra al reporte ─────────────────────────────

  const inventoryItems = useMemo(() => {
    return inventory
      .map((a) => ({ ...a, status: statusFromStock(a.stock, a.threshold) }))
      .filter(
        (a) =>
          a.status === "critical" ||
          a.status === "out" ||
          a.status === "low",
      )
      .filter((a) => !exclusions.has(`inv:${a.id}`))
      .sort((a, b) => a.stock - b.stock);
  }, [inventory, exclusions]);

  const plan = useMemo(() => {
    const all = orders.filter((o) => isMonthlyPlan(o) && o.status === "draft");
    const p = all[0];
    if (!p) return undefined;
    // Filtrar líneas excluidas
    const filteredLines = p.lines.filter(
      (l) => !exclusions.has(`plan:${l.id}`),
    );
    return { ...p, lines: filteredLines };
  }, [orders, exclusions]);

  const readyOrders = useMemo(() => {
    return orders
      .filter((o) => !isMonthlyPlan(o) && o.status === "ready")
      .filter((o) => !exclusions.has(`order:${o.id}`));
  }, [orders, exclusions]);

  const pendingRequests = useMemo(() => {
    return requests
      .filter(
        (r) =>
          r.status === "pending" || r.status === "awaiting_purchase",
      )
      .filter((r) => !exclusions.has(`req:${r.id}`))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [requests, exclusions]);

  const html = useMemo(
    () =>
      renderMonthlyReport({
        monthLabel,
        appUrl,
        sections: config.sections,
        items: inventoryItems,
        plan,
        readyOrders,
        pendingRequests,
        locations,
      }),
    [
      monthLabel,
      appUrl,
      config.sections,
      inventoryItems,
      plan,
      readyOrders,
      pendingRequests,
      locations,
    ],
  );

  // ─── Acciones ────────────────────────────────────────────────────────

  const updateSection = (key: SectionKey, on: boolean) => {
    const next = { ...config, sections: { ...config.sections, [key]: on } };
    setConfig(next);
    saveConfig(next);
  };

  const addRecipient = () => {
    const email = recipientDraft.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Email inválido");
      return;
    }
    if (config.recipients.includes(email)) {
      toast.error("Ese email ya está en la lista");
      return;
    }
    const next = { ...config, recipients: [...config.recipients, email] };
    setConfig(next);
    saveConfig(next);
    setRecipientDraft("");
  };

  const removeRecipient = (email: string) => {
    const next = {
      ...config,
      recipients: config.recipients.filter((r) => r !== email),
    };
    setConfig(next);
    saveConfig(next);
  };

  const sendNow = async () => {
    if (config.recipients.length === 0) {
      toast.error("Agregá al menos un destinatario");
      return;
    }
    setSending(true);
    try {
      // Generar el Excel adjunto con los mismos datos del reporte
      const excelBase64 = await buildReportExcelBase64({
        monthLabel,
        sections: config.sections,
        items: inventoryItems,
        plan,
        readyOrders,
        pendingRequests,
        locations,
      });
      const filename = reportExcelFilename(monthLabel);

      const promises = config.recipients.map((to) =>
        sendEmail({
          to,
          html,
          subject: `invIT — Reporte mensual · ${monthLabel}`,
          attachments: [{ filename, content: excelBase64 }],
        }),
      );
      const results = await Promise.allSettled(promises);
      const failed = results.filter(
        (r) =>
          r.status === "rejected" ||
          (r.status === "fulfilled" && !r.value.ok),
      ).length;
      if (failed === 0) {
        markSentThisMonth();
        toast.success("Reporte enviado", {
          description: `${config.recipients.length} destinatario${config.recipients.length === 1 ? "" : "s"}`,
        });
      } else if (failed < config.recipients.length) {
        markSentThisMonth();
        toast.warning(
          `Enviado parcial — ${failed} fallo${failed === 1 ? "" : "s"}`,
        );
      } else {
        toast.error("No se pudo enviar", {
          description: "Revisá que tengas configurado el API key de Resend.",
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Falló el envío");
    } finally {
      setSending(false);
    }
  };

  const resetExclusions = () => {
    if (
      !window.confirm(
        "¿Resetear todas las exclusiones? Todo lo que sacaste del reporte va a volver a aparecer.",
      )
    )
      return;
    clearExclusions();
    toast.success("Exclusiones reseteadas");
  };

  const totalIncludedInSection = (k: SectionKey): number => {
    if (!config.sections[k]) return 0;
    switch (k) {
      case "inventory":
        return inventoryItems.length;
      case "plan":
        return plan?.lines.length ?? 0;
      case "readyOrders":
        return readyOrders.reduce((s, o) => s + o.lines.length, 0);
      case "pendingRequests":
        return pendingRequests.length;
    }
  };

  // ─── Construir items para el drawer según sección ────────────────────

  const drawerItems: ExclusionItem[] = useMemo(() => {
    if (!drawer) return [];
    if (drawer === "inventory") {
      // Todos los items bajo umbral (no solo los incluidos)
      return inventory
        .map((a) => ({
          ...a,
          status: statusFromStock(a.stock, a.threshold),
        }))
        .filter(
          (a) =>
            a.status === "critical" ||
            a.status === "out" ||
            a.status === "low",
        )
        .map((a) => ({
          id: `inv:${a.id}`,
          title: a.name,
          subtitle: `${a.brand || "—"} · ${a.category} · stock ${a.stock} / mín. ${a.threshold}`,
        }));
    }
    if (drawer === "plan") {
      const all = orders.filter((o) => isMonthlyPlan(o) && o.status === "draft");
      const p = all[0];
      if (!p) return [];
      return p.lines.map((l) => ({
        id: `plan:${l.id}`,
        title: l.name,
        subtitle: `${l.brand || "—"} · ${l.category} · × ${l.qty}`,
      }));
    }
    if (drawer === "readyOrders") {
      return orders
        .filter((o) => !isMonthlyPlan(o) && o.status === "ready")
        .map((o) => ({
          id: `order:${o.id}`,
          title: o.reference,
          subtitle: `${o.lines.length} items · ${o.lines.reduce((s, l) => s + l.qty, 0)} unidades${o.note ? ` · ${o.note}` : ""}`,
          details: o.lines.map((l) => ({
            name: l.name,
            brand: l.brand,
            category: l.category,
            qty: l.qty,
            isNew: l.isNew,
          })),
        }));
    }
    if (drawer === "pendingRequests") {
      return requests
        .filter(
          (r) =>
            r.status === "pending" || r.status === "awaiting_purchase",
        )
        .map((r) => ({
          id: `req:${r.id}`,
          title: `${r.reference} · ${r.requesterName}`,
          subtitle: `${r.qty} × ${r.itemName} · ${r.status === "pending" ? "Pendiente" : "Esperando compra"}`,
        }));
    }
    return [];
  }, [drawer, inventory, orders, requests]);

  const drawerTitle =
    drawer ? SECTIONS.find((s) => s.key === drawer)?.label ?? "" : "";

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[420px_1fr]">
      {/* CONFIG */}
      <aside className="flex flex-col gap-4">
        <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="mb-3 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Mail className="size-3.5" />
            Destinatarios
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5">
            {config.recipients.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium ring-1 ring-foreground/10"
              >
                {r}
                <button
                  type="button"
                  onClick={() => removeRecipient(r)}
                  className="text-muted-foreground hover:text-status-critical"
                  aria-label={`Quitar ${r}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {config.recipients.length === 0 && (
              <span className="text-[12px] text-muted-foreground">
                Sin destinatarios — agregá uno abajo.
              </span>
            )}
          </div>

          <div className="flex gap-1.5">
            <Input
              type="email"
              value={recipientDraft}
              onChange={(e) => setRecipientDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRecipient();
                }
              }}
              placeholder="email@empresa.com"
              className="h-9 flex-1"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addRecipient}
            >
              <Plus className="size-3.5" />
              Agregar
            </Button>
          </div>
        </section>

        <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <Settings2 className="size-3.5" />
              Contenido del reporte
            </div>
            <button
              type="button"
              onClick={resetExclusions}
              className="text-[11px] text-muted-foreground hover:text-status-critical"
              title="Volver a incluir todo lo que excluiste individualmente"
            >
              Resetear exclusiones
            </button>
          </div>

          <ul className="flex flex-col gap-2">
            {SECTIONS.map((s) => {
              const on = config.sections[s.key];
              const count = totalIncludedInSection(s.key);
              return (
                <li
                  key={s.key}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-lg p-3 ring-1 transition-colors",
                    on
                      ? "bg-primary/5 ring-primary/25"
                      : "bg-muted/40 ring-foreground/10",
                  )}
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        updateSection(s.key, e.target.checked)
                      }
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13.5px] font-semibold">
                          {s.label}
                        </span>
                        {on && (
                          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
                            {count}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {s.description}
                      </p>
                    </div>
                  </label>
                  {on && (
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => setDrawer(s.key)}
                      className="ml-7 self-start text-primary hover:text-primary/80"
                    >
                      <ListChecks className="size-3.5" />
                      Editar qué se incluye
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="lg"
            onClick={sendNow}
            disabled={sending || config.recipients.length === 0}
            className="w-full"
          >
            <Send className="size-4" />
            {sending ? "Enviando…" : "Enviar reporte ahora"}
          </Button>
          <p className="text-center text-[11.5px] text-muted-foreground">
            Se adjunta un Excel con los mismos datos del email
          </p>
        </div>
      </aside>

      {/* PREVIEW */}
      <div className="overflow-hidden rounded-xl bg-card p-3 ring-1 ring-foreground/10">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Vista previa en vivo
          </span>
          <span className="text-[11px] text-muted-foreground">
            Refresca al cambiar cualquier cosa a la izquierda
          </span>
        </div>
        <iframe
          title="Preview del reporte mensual"
          srcDoc={html}
          className="block h-[calc(100svh-220px)] min-h-[600px] w-full rounded-lg border-0 bg-[#0f1216]"
        />
      </div>

      <ExclusionDrawer
        open={!!drawer}
        onOpenChange={(v) => {
          if (!v) setDrawer(null);
        }}
        title={drawerTitle}
        items={drawerItems}
        exclusions={exclusions}
        onToggle={(id, excluded) => toggleExclusion(id, excluded)}
      />
    </div>
  );
}
