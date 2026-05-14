"use client";

import { useEffect, useState } from "react";
import { Keyboard, MonitorSmartphone, Moon, Palette, Sliders, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  subscribePreferences,
  type DefaultPage,
  type Density,
  type Preferences,
} from "@/features/settings/lib/preferences";
import { SaveBar, useDirtyState } from "../save-bar";
import {
  SectionCard,
  SectionFooter,
  SectionHeader,
  SettingRow,
} from "../section-primitives";

const SHORTCUTS = [
  { keys: "⌘ K", label: "Abrir el buscador" },
  { keys: "G I", label: "Ir a Inicio" },
  { keys: "G V", label: "Ir a Inventario" },
  { keys: "G C", label: "Ir a Compras" },
  { keys: "G P", label: "Ir a Pedidos" },
  { keys: "G M", label: "Ir a Reporte mensual" },
  { keys: "G S", label: "Ir a Ajustes" },
  { keys: "N", label: "Nuevo item de inventario" },
  { keys: "⌘ ⇧ L", label: "Toggle theme" },
];

export function PreferencesSection() {
  const [initial, setInitial] = useState<Preferences>(() => loadPreferences());
  const { value, setValue, dirty, reset, commit } = useDirtyState(initial);
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sync = () => setInitial(loadPreferences());
    sync();
    return subscribePreferences(sync);
  }, []);

  const handleSave = () => {
    setSaving(true);
    savePreferences(value);
    commit(value);
    setInitial(value);
    setTimeout(() => {
      setSaving(false);
      toast.success("Preferencias guardadas");
    }, 200);
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <SectionCard>
        <SectionHeader
          icon={Palette}
          title="Apariencia"
          description="Ajustes que solo te afectan a vos en este navegador."
        />
        <SettingRow label="Tema" description="Claro, oscuro o automático según el sistema operativo.">
          <div className="inline-flex rounded-lg border border-border bg-input/30 p-0.5 text-[12.5px]">
            {(
              [
                ["light", "Claro", Sun],
                ["dark", "Oscuro", Moon],
                ["system", "Sistema", MonitorSmartphone],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1 transition-colors",
                  theme === id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3" /> {label}
              </button>
            ))}
          </div>
        </SettingRow>
        <SettingRow label="Densidad">
          <Select
            value={value.density}
            onValueChange={(v) => v && setValue({ ...value, density: v as Density })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compacta · más info por pantalla</SelectItem>
              <SelectItem value="comfortable">Cómoda · balance</SelectItem>
              <SelectItem value="cozy">Espaciada · más respiración</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Animaciones" description="Transiciones suaves en menús y diálogos.">
          <div className="flex justify-end">
            <Switch
              checked={value.animations && !value.reducedMotion}
              onCheckedChange={(c) => setValue({ ...value, animations: c })}
            />
          </div>
        </SettingRow>
        <SettingRow label="Reducir movimiento" description="Respeta tus preferencias del sistema. Útil si tenés sensibilidad.">
          <div className="flex justify-end">
            <Switch
              checked={value.reducedMotion}
              onCheckedChange={(c) => setValue({ ...value, reducedMotion: c })}
            />
          </div>
        </SettingRow>
        <SettingRow label="Página de inicio" description="A dónde caés cuando entrás al workspace.">
          <Select
            value={value.defaultPage}
            onValueChange={(v) => v && setValue({ ...value, defaultPage: v as DefaultPage })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="/dashboard">Inicio (dashboard)</SelectItem>
              <SelectItem value="/inventory">Inventario</SelectItem>
              <SelectItem value="/procurement">Compras</SelectItem>
              <SelectItem value="/requests">Pedidos</SelectItem>
              <SelectItem value="/reports">Reporte mensual</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SectionCard>

      <SectionCard>
        <SectionHeader icon={Sliders} title="Comportamiento" description="Detalles finos de la interfaz." />
        <SettingRow label="Mostrar atajos de teclado en menús">
          <div className="flex justify-end">
            <Switch
              checked={value.showKeyboardHints}
              onCheckedChange={(c) => setValue({ ...value, showKeyboardHints: c })}
            />
          </div>
        </SettingRow>
        <SettingRow label="Mostrar banner del reporte mensual">
          <div className="flex justify-end">
            <Switch
              checked={value.showActivityBanner}
              onCheckedChange={(c) => setValue({ ...value, showActivityBanner: c })}
            />
          </div>
        </SettingRow>
        <SettingRow label="Sidebar siempre fijo">
          <div className="flex justify-end">
            <Switch
              checked={value.sidebarPinned}
              onCheckedChange={(c) => setValue({ ...value, sidebarPinned: c })}
            />
          </div>
        </SettingRow>
        <SettingRow label="Badges numéricos en el sidebar">
          <div className="flex justify-end">
            <Switch
              checked={value.showSidebarBadges}
              onCheckedChange={(c) => setValue({ ...value, showSidebarBadges: c })}
            />
          </div>
        </SettingRow>
        <SettingRow label="Agrupar miles en números" description="1.234.567 vs 1234567.">
          <div className="flex justify-end">
            <Switch
              checked={value.numberGrouping}
              onCheckedChange={(c) => setValue({ ...value, numberGrouping: c })}
            />
          </div>
        </SettingRow>
        <SettingRow label="Abrir comando al enfocar la búsqueda del topbar">
          <div className="flex justify-end">
            <Switch
              checked={value.autoOpenCommandOnFocus}
              onCheckedChange={(c) => setValue({ ...value, autoOpenCommandOnFocus: c })}
            />
          </div>
        </SettingRow>
        <SectionFooter>
          <span>Las preferencias se guardan en este navegador.</span>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setValue(DEFAULT_PREFERENCES)}
          >
            Restaurar
          </Button>
        </SectionFooter>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Keyboard}
          title="Atajos de teclado"
          description="Productividad de teclado en estilo Linear / Raycast."
        />
        <div className="grid gap-y-2 px-5 py-5 sm:grid-cols-2 sm:gap-x-6">
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between gap-3 rounded-md py-1.5 text-[12.5px]"
            >
              <span className="text-muted-foreground">{s.label}</span>
              <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-foreground">
                <Keyboard className="size-2.5 text-muted-foreground" />
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </SectionCard>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onDiscard={reset} hint="Apariencia, comportamiento y página inicial" />
    </div>
  );
}
