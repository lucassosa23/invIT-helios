"use client";

import { useEffect, useState } from "react";
import { Building2, Globe, Languages, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  CURRENCIES,
  INDUSTRIES,
  LOCALES,
  MONTHS,
  TIMEZONES,
  WORKSPACE_SIZES,
  loadWorkspace,
  saveWorkspace,
  subscribeWorkspace,
  type Workspace,
} from "@/features/settings/lib/workspace";
import { SaveBar, useDirtyState } from "../save-bar";
import {
  FieldGrid,
  FieldGroup,
  SectionCard,
  SectionFooter,
  SectionHeader,
  SettingRow,
} from "../section-primitives";

export function GeneralSection() {
  const [initial, setInitial] = useState<Workspace>(() => loadWorkspace());
  const { value, setValue, dirty, reset, commit } = useDirtyState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = subscribeWorkspace(() => setInitial(loadWorkspace()));
    return u;
  }, []);

  const handleSave = async () => {
    setSaving(true);
    saveWorkspace(value);
    commit(value);
    setInitial(value);
    setTimeout(() => {
      setSaving(false);
      toast.success("Workspace actualizado");
    }, 250);
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <SectionCard>
        <SectionHeader
          icon={Building2}
          title="Identidad"
          description="Cómo aparece tu workspace en la UI, emails y exports."
        />
        <FieldGrid>
          <FieldGroup label="Nombre del workspace" hint="Visible en el sidebar y exports.">
            <Input
              value={value.name}
              onChange={(e) => setValue({ ...value, name: e.target.value })}
              placeholder="Helios Salud"
            />
          </FieldGroup>
          <FieldGroup label="Slug" hint="Identificador URL-safe. Se usa en links de invitación.">
            <div className="flex items-center gap-2 rounded-lg border border-input bg-background/40 px-2 dark:bg-input/30">
              <span className="text-[12.5px] text-muted-foreground">invit.app/</span>
              <Input
                value={value.slug}
                onChange={(e) =>
                  setValue({
                    ...value,
                    slug: e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, "-")
                      .replace(/^-|-$/g, ""),
                  })
                }
                className="h-7 border-0 bg-transparent px-0 focus-visible:ring-0 dark:bg-transparent"
              />
            </div>
          </FieldGroup>
          <FieldGroup label="Razón social">
            <Input
              value={value.legalName}
              onChange={(e) => setValue({ ...value, legalName: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="CUIT / Tax ID">
            <Input
              value={value.taxId}
              onChange={(e) => setValue({ ...value, taxId: e.target.value })}
              className="font-mono text-[12.5px]"
            />
          </FieldGroup>
          <FieldGroup label="Industria">
            <Select
              value={value.industry}
              onValueChange={(v) => v && setValue({ ...value, industry: v as string })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Elegir industria" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Tamaño de la organización">
            <Select
              value={value.size}
              onValueChange={(v) => v && setValue({ ...value, size: v as string })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tamaño" />
              </SelectTrigger>
              <SelectContent>
                {WORKSPACE_SIZES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s} personas
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldGroup>
          <FieldGroup label="Sitio web" span="full">
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={value.website}
                onChange={(e) => setValue({ ...value, website: e.target.value })}
                className="pl-8"
                placeholder="https://..."
              />
            </div>
          </FieldGroup>
          <FieldGroup label="Email de soporte" span="full">
            <Input
              type="email"
              value={value.supportEmail}
              onChange={(e) => setValue({ ...value, supportEmail: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Descripción interna" hint="Solo se muestra a los miembros del workspace." span="full">
            <Textarea
              rows={3}
              value={value.description}
              onChange={(e) => setValue({ ...value, description: e.target.value })}
            />
          </FieldGroup>
        </FieldGrid>
        <SectionFooter>
          <span>El nombre y slug se muestran en notificaciones y emails.</span>
        </SectionFooter>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Languages}
          title="Localización"
          description="Zona horaria, idioma y formatos para todo el workspace."
        />
        <SettingRow
          label="Zona horaria"
          description="Se usa para programar reportes, alertas y registros de actividad."
        >
          <Select
            value={value.timezone}
            onValueChange={(v) => v && setValue({ ...value, timezone: v as string })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Elegir zona horaria" />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          label="Idioma de la interfaz"
          description="También define el orden de fechas y el separador decimal."
        >
          <Select
            value={value.locale}
            onValueChange={(v) => v && setValue({ ...value, locale: v as string })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Elegir idioma" />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          label="Moneda"
          description="Se aplica a precios de catálogo, órdenes de compra y reportes."
        >
          <Select
            value={value.currency}
            onValueChange={(v) =>
              v && setValue({ ...value, currency: v as Workspace["currency"] })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Moneda" />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Formato de fecha">
          <Select
            value={value.dateFormat}
            onValueChange={(v) =>
              v && setValue({ ...value, dateFormat: v as Workspace["dateFormat"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dd/MM/yyyy">dd/MM/yyyy · 31/12/2026</SelectItem>
              <SelectItem value="MM/dd/yyyy">MM/dd/yyyy · 12/31/2026</SelectItem>
              <SelectItem value="yyyy-MM-dd">yyyy-MM-dd · 2026-12-31</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Inicio de semana">
          <Select
            value={value.weekStart}
            onValueChange={(v) =>
              v && setValue({ ...value, weekStart: v as Workspace["weekStart"] })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monday">Lunes</SelectItem>
              <SelectItem value="sunday">Domingo</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow
          label="Inicio del año fiscal"
          description="Afecta los gráficos de tendencia anual."
        >
          <Select
            value={MONTHS[value.fiscalYearStartMonth - 1] ?? "Enero"}
            onValueChange={(v) => {
              if (!v) return;
              const idx = MONTHS.indexOf(v as string);
              setValue({ ...value, fiscalYearStartMonth: idx + 1 });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SectionFooter>
          <span className="inline-flex items-center gap-1.5">
            <Globe className="size-3.5" /> Hora local:{" "}
            <span className="font-mono text-foreground">
              {new Date().toLocaleString(value.locale, {
                timeZone: value.timezone,
                hour: "2-digit",
                minute: "2-digit",
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
          </span>
          <Button variant="outline" size="xs" onClick={reset} disabled={!dirty}>
            Descartar
          </Button>
        </SectionFooter>
      </SectionCard>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={reset}
        hint="Identidad y localización del workspace"
      />
    </div>
  );
}
