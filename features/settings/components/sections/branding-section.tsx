"use client";

import { useEffect, useState } from "react";
import { Mail, Palette, Sparkles, Type } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ACCENT_SWATCH,
  loadBranding,
  saveBranding,
  subscribeBranding,
  type BrandAccent,
  type Branding,
} from "@/features/settings/lib/branding";
import { SaveBar, useDirtyState } from "../save-bar";
import {
  FieldGrid,
  FieldGroup,
  SectionCard,
  SectionFooter,
  SectionHeader,
  SettingRow,
} from "../section-primitives";

export function BrandingSection() {
  const [initial, setInitial] = useState<Branding>(() => loadBranding());
  const { value, setValue, dirty, reset, commit } = useDirtyState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const u = subscribeBranding(() => setInitial(loadBranding()));
    return u;
  }, []);

  const handleSave = () => {
    setSaving(true);
    saveBranding(value);
    commit(value);
    setInitial(value);
    setTimeout(() => {
      setSaving(false);
      toast.success("Branding actualizado");
    }, 250);
  };

  const accents: BrandAccent[] = [
    "indigo",
    "violet",
    "sky",
    "emerald",
    "amber",
    "rose",
    "slate",
  ];

  return (
    <div className="flex flex-col gap-6 pb-24">
      <SectionCard>
        <SectionHeader
          icon={Sparkles}
          title="Marca"
          description="Cómo se identifica el workspace en la UI y los emails."
        />
        <FieldGrid>
          <FieldGroup label="Nombre corto" hint="Usado en el sidebar.">
            <Input
              value={value.brandShortName}
              onChange={(e) => setValue({ ...value, brandShortName: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Nombre completo" hint="Aparece en exports y emails.">
            <Input
              value={value.brandLongName}
              onChange={(e) => setValue({ ...value, brandLongName: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Monograma del logo" hint="Iniciales del workspace · 2-3 caracteres.">
            <Input
              maxLength={3}
              value={value.logoMonogram}
              onChange={(e) =>
                setValue({ ...value, logoMonogram: e.target.value.toUpperCase() })
              }
              className="font-mono uppercase tracking-widest"
            />
          </FieldGroup>
          <FieldGroup label="Vista previa">
            <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3">
              <div
                className={cn(
                  "grid size-6 place-items-center rounded-md text-[10.5px] font-bold tracking-wider ring-1",
                  ACCENT_SWATCH[value.accent].soft,
                  "ring-foreground/10",
                )}
              >
                {value.logoMonogram}
              </div>
              <span className="text-[12.5px] font-semibold">{value.brandShortName}</span>
              <span className="text-[11px] text-muted-foreground">· Gestión IT</span>
            </div>
          </FieldGroup>
        </FieldGrid>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Palette}
          title="Apariencia"
          description="Color de acento y forma de los componentes."
        />
        <SettingRow
          label="Color de acento"
          description="Se aplica a botones primarios, badges activos y gráficos."
          align="start"
        >
          <div className="flex flex-wrap gap-1.5">
            {accents.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setValue({ ...value, accent: a })}
                className={cn(
                  "group relative grid h-9 w-12 place-items-center rounded-lg border border-border transition-all hover:scale-105",
                  value.accent === a && "ring-2 ring-primary/50",
                )}
                aria-label={ACCENT_SWATCH[a].label}
              >
                <span
                  className={cn(
                    "size-4 rounded-full ring-2 ring-background",
                    ACCENT_SWATCH[a].solid,
                  )}
                />
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow
          label="Densidad"
          description="Cuánto espacio respiran las tablas, formularios y cards."
        >
          <div className="inline-flex rounded-lg border border-border bg-input/30 p-0.5">
            {(["compact", "comfortable"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setValue({ ...value, density: d })}
                className={cn(
                  "h-7 rounded-md px-3 text-[12.5px] transition-colors",
                  value.density === d
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {d === "compact" ? "Compacta" : "Cómoda"}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow
          label="Forma"
          description="Curvatura de los bordes en cards, inputs y botones."
        >
          <div className="inline-flex rounded-lg border border-border bg-input/30 p-0.5">
            {(["sharp", "default", "soft"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setValue({ ...value, radius: r })}
                className={cn(
                  "h-7 px-3 text-[12.5px] transition-colors",
                  r === "sharp" && "rounded-sm",
                  r === "default" && "rounded-md",
                  r === "soft" && "rounded-lg",
                  value.radius === r
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r === "sharp" ? "Recta" : r === "default" ? "Redondeada" : "Suave"}
              </button>
            ))}
          </div>
        </SettingRow>
        <SectionFooter>
          <span>Los cambios se aplican al recargar.</span>
        </SectionFooter>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Mail}
          title="Email"
          description="Footer y firma usadas en el reporte mensual."
        />
        <FieldGrid>
          <FieldGroup label="Pie de página" span="full" hint="Aparece debajo de cada reporte enviado.">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Textarea
                rows={2}
                value={value.emailFooter}
                onChange={(e) => setValue({ ...value, emailFooter: e.target.value })}
                className="pl-8"
              />
            </div>
          </FieldGroup>
          <FieldGroup
            label="Firma del remitente"
            span="full"
            hint="Se inserta al final de los emails operativos."
          >
            <div className="relative">
              <Type className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
              <Textarea
                rows={3}
                value={value.emailSignature}
                onChange={(e) => setValue({ ...value, emailSignature: e.target.value })}
                className="pl-8 font-mono text-[12.5px]"
              />
            </div>
          </FieldGroup>
        </FieldGrid>
      </SectionCard>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onDiscard={reset} hint="Marca, apariencia y firma" />
    </div>
  );
}
