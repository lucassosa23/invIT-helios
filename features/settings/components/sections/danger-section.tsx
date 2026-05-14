"use client";

import { useState } from "react";
import { AlertOctagon, AlertTriangle, FlaskConical, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logAudit } from "@/features/settings/lib/audit-log";
import { loadWorkspace } from "@/features/settings/lib/workspace";
import { SectionCard, SectionHeader } from "../section-primitives";

const STORAGE_KEYS = [
  "invit:inventory:v1",
  "invit:orders:v1",
  "invit:requests:v1",
  "invit:members:v1",
  "invit:categories:v1",
  "invit:workspace:v1",
  "invit:branding:v1",
  "invit:inventory-rules:v1",
  "invit:notifications:v1",
  "invit:preferences:v1",
  "invit:profile:v1",
  "invit:security:v1",
  "invit:email-config:v1",
  "invit:email-exclusions:v1",
  "invit:email-last-sent:v1",
  "invit:monthly-plan:v1",
];

export function DangerSection() {
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const ws = loadWorkspace();

  const resetDataOnly = () => {
    const dataKeys = STORAGE_KEYS.filter(
      (k) => !k.startsWith("invit:profile") && !k.startsWith("invit:preferences"),
    );
    for (const key of dataKeys) localStorage.removeItem(key);
    window.dispatchEvent(new Event("invit:inventory-changed"));
    window.dispatchEvent(new Event("invit:orders-changed"));
    window.dispatchEvent(new Event("invit:requests-changed"));
    logAudit("data.workspace_reset", "Reset operativo · perfil y preferencias preservados");
    toast.success("Workspace reseteado. Recargá la página.");
    setResetOpen(false);
    setConfirmText("");
  };

  const deleteAll = () => {
    for (const key of STORAGE_KEYS) localStorage.removeItem(key);
    logAudit("data.workspace_reset", "Eliminación total del workspace");
    toast.success("Todos los datos fueron purgados.");
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionCard>
        <SectionHeader
          icon={FlaskConical}
          title="Modo sandbox"
          description="Cargá datos demo realistas para probar funcionalidades sin riesgo."
        />
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div className="max-w-prose text-[12.5px] text-muted-foreground">
            Reemplaza el inventario actual por un set de datos sintéticos. Útil
            para demos, capacitaciones y testing. Esta acción no afecta a otros
            workspaces.
          </div>
          <Button variant="outline" size="sm" disabled>
            <FlaskConical className="size-3.5" /> Activar sandbox (próximo)
          </Button>
        </div>
      </SectionCard>

      <SectionCard className="ring-destructive/30">
        <SectionHeader
          icon={AlertTriangle}
          title="Resetear datos operativos"
          description="Borra inventario, compras, pedidos y configuración del workspace. Mantiene tu perfil y preferencias."
        />
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div className="max-w-prose text-[12.5px] text-muted-foreground">
            Esta acción es <span className="font-medium text-foreground">reversible</span>{" "}
            sólo si hiciste un export reciente. La cobertura incluye:
            inventario, órdenes, pedidos, sedes, proveedores, categorías,
            notificaciones, branding y reglas de inventario.
          </div>
          <Button variant="destructive" size="sm" onClick={() => setResetOpen(true)}>
            <AlertTriangle className="size-3.5" /> Resetear workspace
          </Button>
        </div>
      </SectionCard>

      <SectionCard className="bg-destructive/5 ring-destructive/40">
        <SectionHeader
          icon={AlertOctagon}
          title="Eliminar workspace"
          description="Purga absoluta · sin posibilidad de recuperación. La operación queda registrada."
        />
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div className="max-w-prose text-[12.5px] text-destructive/90">
            Todos los datos, miembros, configuración, integraciones y audit log
            se eliminan permanentemente. Esta acción no se puede deshacer.
          </div>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <AlertOctagon className="size-3.5" /> Eliminar workspace
          </Button>
        </div>
      </SectionCard>

      <Dialog
        open={resetOpen}
        onOpenChange={(o) => {
          setResetOpen(o);
          if (!o) setConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" /> Resetear &ldquo;{ws.name}&rdquo;
            </DialogTitle>
            <DialogDescription>
              Para confirmar escribí{" "}
              <span className="font-mono text-foreground">RESET</span>.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESET"
            className="font-mono"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResetOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={confirmText !== "RESET"}
              onClick={resetDataOnly}
            >
              <Trash2 className="size-3.5" /> Sí, resetear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertOctagon className="size-4" /> Eliminar workspace permanentemente
            </DialogTitle>
            <DialogDescription>
              Esta operación purga todos los datos. Para confirmar, escribí el
              slug del workspace:{" "}
              <span className="font-mono text-foreground">{ws.slug}</span>
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={ws.slug}
            className="font-mono"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={confirmText !== ws.slug}
              onClick={deleteAll}
            >
              <AlertOctagon className="size-3.5" /> Eliminar para siempre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
