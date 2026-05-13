"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLocations } from "@/lib/fake-data";
import { loadInventory, subscribeInventory } from "@/lib/storage";
import { renderLowStockEmail } from "@/features/emails/low-stock-template";
import type { Asset } from "@/lib/fake-data";

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

export default function EmailPreviewPage() {
  const locations = useMemo(() => getLocations(), []);

  const [items, setItems] = useState<Asset[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [recipient, setRecipient] = useState("sistemas@heliossalud.com.ar");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const compute = () => {
      const stored = loadInventory();
      const next = (stored ?? [])
        .filter(
          (a) =>
            a.status === "critical" ||
            a.status === "out" ||
            a.status === "low",
        )
        .sort((a, b) => a.stock - b.stock);
      setItems(next);
      setHydrated(true);
    };
    compute();
    return subscribeInventory(compute);
  }, []);

  const monthLabel = useMemo(() => {
    const now = new Date();
    return `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const html = useMemo(
    () =>
      renderLowStockEmail({
        items,
        locations,
        monthLabel,
        appUrl,
      }),
    [items, locations, monthLabel, appUrl],
  );

  const handleSendTest = async () => {
    if (!recipient.trim()) {
      toast.error("Ingresá un destinatario");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/notify-low-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient.trim(),
          html,
          subject: `invIT — Stock bajo · ${monthLabel}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("No se pudo enviar", {
          description:
            data?.error ?? `Error ${res.status}. Configurá Resend en .env.`,
        });
      } else {
        toast.success("Email enviado", {
          description: `Destinatario: ${recipient.trim()}`,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Falló el envío", {
        description: "Revisá la consola del servidor.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Notificaciones"
        title="Vista previa del email mensual"
        description="Así llega el resumen de stock bajo a tu equipo. Probá un envío real antes de programarlo."
        action={
          <Link
            href="/inventory"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft className="size-3.5" />
            Volver al inventario
          </Link>
        }
      />

      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor="recipient" className="text-[12px]">
              Destinatario de prueba
            </Label>
            <Input
              id="recipient"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="vos@empresa.com"
              className="h-9 max-w-md"
            />
          </div>
          <div className="text-[12px] text-muted-foreground">
            <div className="font-medium text-foreground">
              {hydrated ? items.length : "—"} items en el resumen
            </div>
            <div className="mt-0.5">
              {hydrated && items.length === 0
                ? "Sin alertas este mes."
                : "Crítico, agotado o bajo umbral."}
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleSendTest}
            disabled={sending}
            className="ml-auto"
          >
            {sending ? (
              <>Enviando…</>
            ) : (
              <>
                <Send className="size-3.5" />
                Enviar prueba
              </>
            )}
          </Button>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <Mail className="size-3" />
          Si no configuraste Resend, el envío devuelve 503 y te lo indicamos.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl bg-card p-3 ring-1 ring-foreground/10">
        <iframe
          title="Vista previa del email"
          srcDoc={html}
          className="block h-[900px] w-full rounded-lg border-0 bg-[#0f1216]"
        />
      </div>
    </div>
  );
}
