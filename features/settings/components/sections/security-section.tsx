"use client";

import { useEffect, useState } from "react";
import { FileClock, Fingerprint, Globe, KeyRound, Lock, Plus, Shield, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { NumberInput } from "@/components/ui/number-input";
import {
  DEFAULT_SECURITY,
  loadSecurity,
  saveSecurity,
  type Security,
} from "@/features/settings/lib/security";
import { SaveBar, useDirtyState } from "../save-bar";
import {
  SectionCard,
  SectionFooter,
  SectionHeader,
  SettingRow,
} from "../section-primitives";

export function SecuritySection() {
  const [initial, setInitial] = useState<Security>(() => loadSecurity());
  const { value, setValue, dirty, reset, commit } = useDirtyState(initial);
  const [saving, setSaving] = useState(false);
  const [newIp, setNewIp] = useState("");

  useEffect(() => {
    const sync = () => setInitial(loadSecurity());
    sync();
  }, []);

  const handleSave = () => {
    setSaving(true);
    saveSecurity(value);
    commit(value);
    setInitial(value);
    setTimeout(() => {
      setSaving(false);
      toast.success("Política de seguridad actualizada");
    }, 200);
  };

  const addIp = () => {
    const trimmed = newIp.trim();
    if (!trimmed) return;
    if (value.ipAllowlist.includes(trimmed)) {
      toast.error("Ya está en la lista");
      return;
    }
    setValue({ ...value, ipAllowlist: [...value.ipAllowlist, trimmed] });
    setNewIp("");
  };

  const removeIp = (ip: string) => {
    setValue({ ...value, ipAllowlist: value.ipAllowlist.filter((x) => x !== ip) });
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <SectionCard>
        <SectionHeader icon={Fingerprint} title="Autenticación" description="Cómo se autentican los miembros del workspace." />
        <SettingRow
          label="Forzar MFA en todos los miembros"
          description="Bloquea el acceso hasta que cada usuario configure un segundo factor."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.enforceMfa}
              onCheckedChange={(c) => setValue({ ...value, enforceMfa: c })}
            />
          </div>
        </SettingRow>
        <SettingRow
          label="Notificar inicios de sesión"
          description="Email al usuario cuando se inicie sesión desde un nuevo dispositivo o IP."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.loginNotifications}
              onCheckedChange={(c) => setValue({ ...value, loginNotifications: c })}
            />
          </div>
        </SettingRow>
        <SettingRow
          label="Tiempo de sesión"
          description="Después de este tiempo de inactividad, la sesión expira."
        >
          <Select
            value={String(value.sessionTimeoutMinutes)}
            onValueChange={(v) =>
              v && setValue({ ...value, sessionTimeoutMinutes: Number(v) })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">1 hora</SelectItem>
              <SelectItem value="240">4 horas</SelectItem>
              <SelectItem value="480">8 horas</SelectItem>
              <SelectItem value="1440">1 día</SelectItem>
              <SelectItem value="10080">7 días</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Shield}
          title="Single sign-on (SSO)"
          description="Centralizá el acceso usando tu IdP corporativo. Disponible en plan Enterprise."
        />
        <SettingRow
          label="Habilitar SSO"
          description="Una vez activo, los miembros sólo podrán entrar mediante el IdP."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.ssoEnabled}
              onCheckedChange={(c) => setValue({ ...value, ssoEnabled: c })}
            />
          </div>
        </SettingRow>
        {value.ssoEnabled && (
          <>
            <SettingRow label="Proveedor">
              <Select
                value={value.ssoProvider}
                onValueChange={(v) =>
                  v && setValue({ ...value, ssoProvider: v as Security["ssoProvider"] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="okta">Okta · SAML 2.0</SelectItem>
                  <SelectItem value="azure">Microsoft Entra ID</SelectItem>
                  <SelectItem value="google">Google Workspace</SelectItem>
                  <SelectItem value="none">Sin proveedor</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow
              label="Dominio"
              description="Email permitido (ej: heliossalud.com.ar). Se restringe el acceso a este dominio."
            >
              <Input
                value={value.ssoDomain}
                onChange={(e) => setValue({ ...value, ssoDomain: e.target.value })}
                placeholder="heliossalud.com.ar"
                className="font-mono text-[12.5px]"
              />
            </SettingRow>
          </>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={KeyRound}
          title="Política de contraseñas"
          description="Aplica a sesiones que no usen SSO."
        />
        <SettingRow label="Largo mínimo">
          <NumberInput
            value={value.passwordMinLength}
            onChange={(v) => setValue({ ...value, passwordMinLength: v })}
            min={6}
            max={64}
            className="w-24"
          />
        </SettingRow>
        <SettingRow label="Requerir mayúsculas">
          <div className="flex justify-end">
            <Switch
              checked={value.passwordRequireUpper}
              onCheckedChange={(c) => setValue({ ...value, passwordRequireUpper: c })}
            />
          </div>
        </SettingRow>
        <SettingRow label="Requerir números">
          <div className="flex justify-end">
            <Switch
              checked={value.passwordRequireNumber}
              onCheckedChange={(c) => setValue({ ...value, passwordRequireNumber: c })}
            />
          </div>
        </SettingRow>
        <SettingRow label="Requerir símbolos">
          <div className="flex justify-end">
            <Switch
              checked={value.passwordRequireSymbol}
              onCheckedChange={(c) => setValue({ ...value, passwordRequireSymbol: c })}
            />
          </div>
        </SettingRow>
        <SettingRow
          label="Rotación obligatoria"
          description="Días antes de pedir un cambio de contraseña. 0 desactiva la rotación."
        >
          <NumberInput
            value={value.passwordRotationDays}
            onChange={(v) => setValue({ ...value, passwordRotationDays: v })}
            min={0}
            max={365}
            className="w-24"
          />
        </SettingRow>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Globe}
          title="IP allowlist"
          description="Restringí el acceso a un conjunto de IPs o rangos CIDR."
        />
        <SettingRow label="Habilitar lista de IPs permitidas">
          <div className="flex justify-end">
            <Switch
              checked={value.ipAllowlistEnabled}
              onCheckedChange={(c) => setValue({ ...value, ipAllowlistEnabled: c })}
            />
          </div>
        </SettingRow>
        {value.ipAllowlistEnabled && (
          <div className="border-b border-border/60 px-5 py-4 last:border-b-0">
            <div className="flex flex-wrap items-center gap-2">
              {value.ipAllowlist.map((ip) => (
                <span
                  key={ip}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 font-mono text-[12px]"
                >
                  <Globe className="size-3 text-muted-foreground" />
                  {ip}
                  <button
                    type="button"
                    onClick={() => removeIp(ip)}
                    className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {value.ipAllowlist.length === 0 && (
                <span className="text-[12px] text-muted-foreground">
                  Lista vacía. Agregá una IP o rango CIDR.
                </span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                placeholder="190.0.0.0/24"
                className="max-w-xs font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addIp();
                  }
                }}
              />
              <Button variant="outline" size="sm" onClick={addIp}>
                <Plus className="size-3.5" /> Agregar
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={FileClock}
          title="Auditoría"
          description="Cuánto tiempo se conserva el audit log."
        />
        <SettingRow label="Retención del audit log">
          <Select
            value={String(value.auditRetentionDays)}
            onValueChange={(v) =>
              v && setValue({ ...value, auditRetentionDays: Number(v) })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 días</SelectItem>
              <SelectItem value="90">90 días</SelectItem>
              <SelectItem value="180">180 días</SelectItem>
              <SelectItem value="365">1 año (recomendado)</SelectItem>
              <SelectItem value="730">2 años</SelectItem>
              <SelectItem value="2555">7 años (compliance)</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
        <SectionFooter>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-status-info" /> El audit log
            es inmutable y firma cada entrada con HMAC-SHA256.
          </span>
          <Button
            variant="outline"
            size="xs"
            onClick={() => setValue(DEFAULT_SECURITY)}
          >
            <Lock className="size-3" /> Restaurar
          </Button>
        </SectionFooter>
      </SectionCard>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onDiscard={reset} hint="Política de seguridad y SSO" />
    </div>
  );
}
