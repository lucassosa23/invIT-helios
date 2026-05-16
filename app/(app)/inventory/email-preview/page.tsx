"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLocations } from "@/lib/fake-data";
import { useInventory } from "@/lib/hooks";
import { renderLowStockEmail } from "@/features/emails/low-stock-template";
import { sendEmail } from "@/features/emails/send-email";

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
  const inventory = useInventory();
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);

  const items = useMemo(
    () =>
      inventory
        .filter(
          (a) =>
            a.status === "critical" ||
            a.status === "out" ||
            a.status === "low",
        )
        .sort((a, b) => a.stock - b.stock),
    [inventory],
  );

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
      const result = await sendEmail({
        to: recipient.trim(),
        html,
        subject: `invIT — Stock bajo · ${monthLabel}`,
      });
      if (!result.ok) {
        toast.error("No se pudo enviar", { description: result.error });
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
              {items.length} items en el resumen
            </div>
            <div className="mt-0.5">
              {items.length === 0
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
