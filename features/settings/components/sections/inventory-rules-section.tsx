"use client";

import { useEffect, useState } from "react";
import {
  Calculator,
  Hash,
  Lock,
  ShieldAlert,
  ShoppingBag,
  TrendingDown,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_RULES,
  SKU_STRATEGY_LABEL,
  loadRules,
  saveRules,
  subscribeRules,
  type InventoryRules,
  type SkuStrategy,
} from "@/features/settings/lib/inventory-rules";
import { SaveBar, useDirtyState } from "../save-bar";
import {
  SectionCard,
  SectionFooter,
  SectionHeader,
  SettingRow,
} from "../section-primitives";

export function InventoryRulesSection() {
  const [initial, setInitial] = useState<InventoryRules>(() => loadRules());
  const { value, setValue, dirty, reset, commit } = useDirtyState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = subscribeRules(() => setInitial(loadRules()));
    return u;
  }, []);

  const handleSave = () => {
    setSaving(true);
    saveRules(value);
    commit(value);
    setInitial(value);
    setTimeout(() => {
      setSaving(false);
      toast.success("Reglas actualizadas");
    }, 200);
  };

  const criticalPreview = Math.max(
    1,
    Math.floor(value.defaultThreshold * value.criticalMultiplier),
  );

  return (
    <div className="flex flex-col gap-6 pb-24">
      <SectionCard>
        <SectionHeader
          icon={TrendingDown}
          title="Umbrales y alertas"
          description="Cuándo un item se considera bajo, crítico o agotado. Las categorías pueden sobrescribir esto."
        />
        <SettingRow
          label="Umbral por defecto"
          description="Cantidad mínima saludable. Items nuevos toman este valor si no hay regla por categoría."
        >
          <NumberInput
            value={value.defaultThreshold}
            onChange={(v) => setValue({ ...value, defaultThreshold: v })}
            min={1}
            max={9999}
          />
        </SettingRow>
        <SettingRow
          label="Coeficiente crítico"
          description="Por debajo de este porcentaje del umbral, el item entra en estado crítico."
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={75}
              step={5}
              value={Math.round(value.criticalMultiplier * 100)}
              onChange={(e) =>
                setValue({
                  ...value,
                  criticalMultiplier: Number(e.target.value) / 100,
                })
              }
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-input accent-primary"
            />
            <span className="w-14 text-right font-mono text-[12.5px]">
              {Math.round(value.criticalMultiplier * 100)}%
            </span>
          </div>
        </SettingRow>
        <SettingRow
          label="Alerta de garantía"
          description="Cuántos días antes del vencimiento se considera 'próxima a vencer'."
        >
          <div className="flex items-center gap-2">
            <NumberInput
              value={value.warrantyAlertDays}
              onChange={(v) => setValue({ ...value, warrantyAlertDays: v })}
              min={1}
              max={730}
              className="w-24"
            />
            <span className="text-[12.5px] text-muted-foreground">días</span>
          </div>
        </SettingRow>
        <SettingRow
          label="Actualizar estado automáticamente"
          description="Recalcular healthy/low/critical/out al cambiar el stock."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.autoStatusUpdate}
              onCheckedChange={(c) => setValue({ ...value, autoStatusUpdate: c })}
            />
          </div>
        </SettingRow>
        <SectionFooter>
          <span className="inline-flex items-center gap-1.5">
            <Calculator className="size-3.5" />
            Con tu configuración: un item con umbral{" "}
            <span className="font-mono text-foreground">{value.defaultThreshold}</span>{" "}
            entra en crítico cuando llega a{" "}
            <span className="font-mono text-status-critical">{criticalPreview}</span>{" "}
            unidades.
          </span>
        </SectionFooter>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Hash}
          title="Codificación de SKU"
          description="Cómo se generan los identificadores cuando creás un item."
        />
        <SettingRow label="Estrategia">
          <Select
            value={value.skuStrategy}
            onValueChange={(v) =>
              v && setValue({ ...value, skuStrategy: v as SkuStrategy })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SKU_STRATEGY_LABEL) as SkuStrategy[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {SKU_STRATEGY_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          label="Prefijo del workspace"
          description="Opcional. Si se define, se antepone a todos los SKU."
        >
          <Input
            value={value.skuPrefix}
            onChange={(e) =>
              setValue({
                ...value,
                skuPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
              })
            }
            placeholder="HS · IT · vacío"
            className="font-mono text-[12.5px]"
            maxLength={5}
          />
        </SettingRow>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Wrench}
          title="Validaciones al crear o editar"
          description="Campos que el formulario va a exigir antes de guardar."
        />
        <SettingRow
          label="Marca obligatoria"
          description="Útil si tu inventario es 100% catálogo de marca."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.requireBrand}
              onCheckedChange={(c) => setValue({ ...value, requireBrand: c })}
            />
          </div>
        </SettingRow>
        <SettingRow
          label="Ubicación obligatoria"
          description="Forzar que cada item esté en una sede."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.requireLocation}
              onCheckedChange={(c) => setValue({ ...value, requireLocation: c })}
            />
          </div>
        </SettingRow>
        <SettingRow
          label="Garantía obligatoria"
          description="Solo activar si todos tus items tienen fecha de garantía."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.requireWarranty}
              onCheckedChange={(c) => setValue({ ...value, requireWarranty: c })}
            />
          </div>
        </SettingRow>
        <SettingRow
          label="Número de serie obligatorio"
          description="Recomendado para activos críticos."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.requireSerial}
              onCheckedChange={(c) => setValue({ ...value, requireSerial: c })}
            />
          </div>
        </SettingRow>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Lock}
          title="Reglas de stock"
          description="Controles que evitan que el inventario se rompa."
        />
        <SettingRow
          label="Permitir stock negativo"
          description="Si se desactiva, las entregas que dejarían el stock por debajo de cero se bloquean."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.allowNegativeStock}
              onCheckedChange={(c) => setValue({ ...value, allowNegativeStock: c })}
            />
          </div>
        </SettingRow>
        <SettingRow
          label="Bloquear por stock de seguridad"
          description="No permitir bajar de un nivel mínimo, incluso si hay stock."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.blockBelowSafetyStock}
              onCheckedChange={(c) =>
                setValue({ ...value, blockBelowSafetyStock: c })
              }
            />
          </div>
        </SettingRow>
        {value.blockBelowSafetyStock && (
          <SettingRow
            label="Stock de seguridad"
            description="Unidades intocables (reservadas para emergencias)."
          >
            <NumberInput
              value={value.safetyStock}
              onChange={(v) => setValue({ ...value, safetyStock: v })}
              min={0}
              max={999}
            />
          </SettingRow>
        )}
        <SectionFooter>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="size-3.5" /> Estos controles se aplican al
            descontar inventario en entregas y recepciones.
          </span>
        </SectionFooter>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={ShoppingBag}
          title="Compras"
          description="Reglas del flujo de plan mensual y aprobación de órdenes."
        />
        <SettingRow
          label="Día del plan mensual"
          description="Día del mes en que se notifica y consolida el plan."
        >
          <NumberInput
            value={value.monthlyPlanDay}
            onChange={(v) => setValue({ ...value, monthlyPlanDay: v })}
            min={1}
            max={28}
            className="w-20"
          />
        </SettingRow>
        <SettingRow
          label="Requerir aprobación"
          description="Las órdenes por encima del umbral van a estado pending → admin antes de enviarse."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.procurementApprovalRequired}
              onCheckedChange={(c) =>
                setValue({ ...value, procurementApprovalRequired: c })
              }
            />
          </div>
        </SettingRow>
        {value.procurementApprovalRequired && (
          <SettingRow
            label="Umbral de aprobación"
            description="Monto en USD a partir del cual se requiere aprobación."
          >
            <div className="flex items-center gap-2">
              <span className="text-[12.5px] text-muted-foreground">USD</span>
              <NumberInput
                value={value.procurementApprovalThresholdUsd}
                onChange={(v) =>
                  setValue({ ...value, procurementApprovalThresholdUsd: v })
                }
                min={0}
                max={1000000}
              />
            </div>
          </SettingRow>
        )}
        <SectionFooter>
          <span className="inline-flex items-center gap-1.5">
            <ShieldAlert className="size-3.5 text-status-low" /> Los cambios
            afectan únicamente a órdenes nuevas. Las existentes mantienen su
            estado actual.
          </span>
          <button
            type="button"
            onClick={() => setValue(DEFAULT_RULES)}
            className="rounded-md border border-border bg-background px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Restaurar valores por defecto
          </button>
        </SectionFooter>
      </SectionCard>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={reset}
        hint="Umbrales, SKU, validaciones y compras"
      />
    </div>
  );
}
