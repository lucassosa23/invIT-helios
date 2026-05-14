"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Smartphone, User } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PROFILE,
  loadProfile,
  saveProfile,
  subscribeProfile,
  type Profile,
} from "@/features/settings/lib/profile";
import { initials } from "@/lib/format";
import { SaveBar, useDirtyState } from "../save-bar";
import {
  FieldGrid,
  FieldGroup,
  SectionCard,
  SectionFooter,
  SectionHeader,
  SettingRow,
} from "../section-primitives";

export function ProfileSection() {
  const [initial, setInitial] = useState<Profile>(() => loadProfile());
  const { value, setValue, dirty, reset, commit } = useDirtyState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const sync = () => setInitial(loadProfile());
    sync();
    return subscribeProfile(sync);
  }, []);

  const handleSave = () => {
    setSaving(true);
    saveProfile({ ...value, initials: initials(value.name) });
    commit({ ...value, initials: initials(value.name) });
    setInitial({ ...value, initials: initials(value.name) });
    setTimeout(() => {
      setSaving(false);
      toast.success("Perfil actualizado");
    }, 200);
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <SectionCard>
        <SectionHeader icon={User} title="Información personal" description="Cómo te ven el resto del equipo." />
        <div className="flex items-center gap-4 px-5 py-5">
          <div className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-primary/10 text-lg font-semibold ring-2 ring-primary/30">
            {initials(value.name)}
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-[13px] font-medium">{value.name}</div>
            <div className="text-[12px] text-muted-foreground">{value.jobTitle} · {value.team}</div>
            <Button variant="outline" size="xs" className="mt-1 w-fit" disabled>
              Subir foto (próximo)
            </Button>
          </div>
        </div>
        <FieldGrid>
          <FieldGroup label="Nombre completo">
            <Input value={value.name} onChange={(e) => setValue({ ...value, name: e.target.value })} />
          </FieldGroup>
          <FieldGroup label="Email">
            <Input
              type="email"
              value={value.email}
              onChange={(e) => setValue({ ...value, email: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Cargo">
            <Input
              value={value.jobTitle}
              onChange={(e) => setValue({ ...value, jobTitle: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Equipo">
            <Input
              value={value.team}
              onChange={(e) => setValue({ ...value, team: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Teléfono">
            <Input
              value={value.phone}
              onChange={(e) => setValue({ ...value, phone: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Iniciales (avatar fallback)">
            <Input
              value={initials(value.name)}
              disabled
              className="font-mono uppercase"
            />
          </FieldGroup>
          <FieldGroup label="Bio" span="full" hint="Visible para otros miembros del workspace.">
            <Textarea
              rows={3}
              value={value.bio}
              onChange={(e) => setValue({ ...value, bio: e.target.value })}
            />
          </FieldGroup>
          <FieldGroup label="Firma de correo" span="full">
            <Textarea
              rows={3}
              value={value.signature}
              onChange={(e) => setValue({ ...value, signature: e.target.value })}
              className="font-mono text-[12.5px]"
            />
          </FieldGroup>
        </FieldGrid>
      </SectionCard>

      <SectionCard>
        <SectionHeader icon={ShieldCheck} title="Seguridad de cuenta" description="Doble factor y notificaciones de seguridad." />
        <SettingRow
          label="Autenticación de dos factores"
          description="Recomendado para owners y admins. Usá una app TOTP (1Password, Authy, Google Authenticator)."
        >
          <div className="flex items-center justify-end gap-2">
            <span className="text-[12px] text-muted-foreground">
              {value.twoFactorEnabled ? "Activo" : "Inactivo"}
            </span>
            <Switch
              checked={value.twoFactorEnabled}
              onCheckedChange={(c) => setValue({ ...value, twoFactorEnabled: c })}
            />
          </div>
        </SettingRow>
        <SettingRow
          label="Notificaciones por email"
          description="Recibir todos los eventos importantes en este email."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.emailNotifications}
              onCheckedChange={(c) => setValue({ ...value, emailNotifications: c })}
            />
          </div>
        </SettingRow>
        <SectionFooter>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-status-info" />
            Última sesión iniciada desde Chrome · Buenos Aires
          </span>
          <Button variant="outline" size="xs" disabled>
            <Smartphone className="size-3" /> Ver dispositivos (próximo)
          </Button>
        </SectionFooter>
      </SectionCard>

      <SaveBar dirty={dirty} saving={saving} onSave={handleSave} onDiscard={reset} hint="Tu información personal" />
      {void DEFAULT_PROFILE}
    </div>
  );
}
