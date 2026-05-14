"use client";

import { useEffect, useState } from "react";
import { Bell, Clock4, Mail, MessageSquare, Plus, Trash2, Users, X, Zap } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  CHANNEL_LABEL,
  DEFAULT_NOTIFICATIONS,
  EVENT_DESCRIPTION,
  EVENT_LABEL,
  loadNotifications,
  saveNotifications,
  type Channel,
  type NotificationConfig,
  type NotificationEvent,
} from "@/features/settings/lib/notifications";
import { SaveBar, useDirtyState } from "../save-bar";
import {
  SectionCard,
  SectionFooter,
  SectionHeader,
  SettingRow,
} from "../section-primitives";

const CHANNEL_ICON: Record<Channel, React.ElementType> = {
  email: Mail,
  inapp: Bell,
  slack: MessageSquare,
};

const EVENT_LIST: NotificationEvent[] = [
  "stock.low",
  "stock.critical",
  "stock.out",
  "warranty.expiring",
  "request.created",
  "request.approved",
  "request.delivered",
  "order.created",
  "order.received",
  "report.monthly_ready",
];

const CHANNELS: Channel[] = ["email", "inapp", "slack"];

export function NotificationsSection() {
  const [initial, setInitial] = useState<NotificationConfig>(() => loadNotifications());
  const { value, setValue, dirty, reset, commit } = useDirtyState(initial);
  const [saving, setSaving] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");

  useEffect(() => {
    const sync = () => setInitial(loadNotifications());
    sync();
  }, []);

  const toggleChannel = (e: NotificationEvent, c: Channel) => {
    setValue({
      ...value,
      channels: {
        ...value.channels,
        [e]: { ...value.channels[e], [c]: !value.channels[e][c] },
      },
    });
  };

  const handleSave = () => {
    setSaving(true);
    saveNotifications(value);
    commit(value);
    setInitial(value);
    setTimeout(() => {
      setSaving(false);
      toast.success("Notificaciones actualizadas");
    }, 200);
  };

  const addRecipient = () => {
    const v = newRecipient.trim();
    if (!v || !v.includes("@")) {
      toast.error("Email inválido");
      return;
    }
    if (value.recipients.includes(v)) {
      toast.error("Ya está en la lista");
      return;
    }
    setValue({ ...value, recipients: [...value.recipients, v] });
    setNewRecipient("");
  };

  const removeRecipient = (email: string) => {
    setValue({ ...value, recipients: value.recipients.filter((r) => r !== email) });
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <SectionCard>
        <SectionHeader
          icon={Zap}
          title="Eventos y canales"
          description="Elegí qué notificaciones recibir y por dónde. Las filas en gris no se envían a ningún canal."
        />
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b border-border/60">
              <tr>
                <th className="px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Evento
                </th>
                {CHANNELS.map((c) => {
                  const Icon = CHANNEL_ICON[c];
                  return (
                    <th
                      key={c}
                      className="px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="size-3" /> {CHANNEL_LABEL[c]}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {EVENT_LIST.map((evt) => {
                const ch = value.channels[evt];
                const anyOn = ch.email || ch.inapp || ch.slack;
                return (
                  <tr
                    key={evt}
                    className={cn(
                      "border-b border-border/60 transition-colors hover:bg-muted/30",
                      !anyOn && "opacity-50",
                    )}
                  >
                    <td className="px-5 py-3">
                      <div className="text-[13px] font-medium">{EVENT_LABEL[evt]}</div>
                      <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                        {EVENT_DESCRIPTION[evt]}
                      </div>
                    </td>
                    {CHANNELS.map((c) => (
                      <td key={c} className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={ch[c]}
                            onCheckedChange={() => toggleChannel(evt, c)}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SectionFooter>
          <span>Email funciona out-of-the-box. Los canales adicionales se habilitan al integrar un proveedor.</span>
          <button
            type="button"
            onClick={() => setValue(DEFAULT_NOTIFICATIONS)}
            className="rounded-md border border-border bg-background px-2.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Restaurar valores recomendados
          </button>
        </SectionFooter>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Users}
          title="Destinatarios"
          description="Direcciones de correo que reciben emails. Para usuarios del workspace, los emails van por defecto."
        />
        <div className="px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {value.recipients.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-[12.5px]"
              >
                <Mail className="size-3 text-muted-foreground" />
                {email}
                <button
                  type="button"
                  onClick={() => removeRecipient(email)}
                  className="rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Quitar ${email}`}
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              type="email"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              placeholder="ejemplo@empresa.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRecipient();
                }
              }}
              className="max-w-sm"
            />
            <Button variant="outline" size="sm" onClick={addRecipient}>
              <Plus className="size-3.5" /> Agregar
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          icon={Clock4}
          title="Resúmenes y horarios"
          description="Cuándo enviar el digest y cuándo no molestar."
        />
        <SettingRow
          label="Resumen diario"
          description="Agrupar las notificaciones del día en un solo email."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.digestEnabled}
              onCheckedChange={(c) => setValue({ ...value, digestEnabled: c })}
            />
          </div>
        </SettingRow>
        {value.digestEnabled && (
          <>
            <SettingRow label="Frecuencia del digest">
              <Select
                value={value.digestFrequency}
                onValueChange={(v) =>
                  v &&
                  setValue({
                    ...value,
                    digestFrequency: v as NotificationConfig["digestFrequency"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal · lunes</SelectItem>
                  <SelectItem value="off">Manual</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Hora de envío">
              <Input
                type="time"
                value={value.digestTime}
                onChange={(e) => setValue({ ...value, digestTime: e.target.value })}
                className="w-32"
              />
            </SettingRow>
          </>
        )}
        <SettingRow
          label="Horas silenciosas"
          description="Las notificaciones se acumulan y salen al terminar la franja."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.quietHoursEnabled}
              onCheckedChange={(c) => setValue({ ...value, quietHoursEnabled: c })}
            />
          </div>
        </SettingRow>
        {value.quietHoursEnabled && (
          <SettingRow label="Franja silenciosa">
            <div className="flex items-center gap-2">
              <Input
                type="time"
                value={value.quietHoursStart}
                onChange={(e) =>
                  setValue({ ...value, quietHoursStart: e.target.value })
                }
                className="w-28"
              />
              <span className="text-[12.5px] text-muted-foreground">a</span>
              <Input
                type="time"
                value={value.quietHoursEnd}
                onChange={(e) =>
                  setValue({ ...value, quietHoursEnd: e.target.value })
                }
                className="w-28"
              />
            </div>
          </SettingRow>
        )}
        <SettingRow
          label="No molestar los fines de semana"
          description="Sábado y domingo no se envían emails (excepto críticos)."
        >
          <div className="flex justify-end">
            <Switch
              checked={value.doNotDisturbWeekends}
              onCheckedChange={(c) =>
                setValue({ ...value, doNotDisturbWeekends: c })
              }
            />
          </div>
        </SettingRow>
      </SectionCard>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={reset}
        hint="Eventos, destinatarios y horarios"
      />
      <Trash2 className="sr-only" />
    </div>
  );
}
