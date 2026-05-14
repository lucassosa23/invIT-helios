"use client";

import { logAudit } from "./audit-log";

const KEY = "invit:notifications:v1";

export type NotificationEvent =
  | "stock.low"
  | "stock.critical"
  | "stock.out"
  | "warranty.expiring"
  | "request.created"
  | "request.approved"
  | "request.delivered"
  | "order.created"
  | "order.received"
  | "report.monthly_ready";

export type Channel = "email" | "inapp" | "slack";

export type NotificationConfig = {
  channels: Record<NotificationEvent, Record<Channel, boolean>>;
  recipients: string[];
  digestEnabled: boolean;
  digestTime: string;
  digestFrequency: "daily" | "weekly" | "off";
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  doNotDisturbWeekends: boolean;
};

const allOff: Record<Channel, boolean> = { email: false, inapp: false, slack: false };

export const DEFAULT_NOTIFICATIONS: NotificationConfig = {
  channels: {
    "stock.low": { email: false, inapp: true, slack: false },
    "stock.critical": { email: true, inapp: true, slack: true },
    "stock.out": { email: true, inapp: true, slack: true },
    "warranty.expiring": { email: true, inapp: true, slack: false },
    "request.created": { email: false, inapp: true, slack: false },
    "request.approved": { email: true, inapp: true, slack: false },
    "request.delivered": { email: false, inapp: true, slack: false },
    "order.created": { email: false, inapp: true, slack: false },
    "order.received": { email: true, inapp: true, slack: false },
    "report.monthly_ready": { email: true, inapp: true, slack: false },
  },
  recipients: ["sistemas@heliossalud.com.ar"],
  digestEnabled: true,
  digestTime: "09:00",
  digestFrequency: "daily",
  quietHoursEnabled: false,
  quietHoursStart: "20:00",
  quietHoursEnd: "08:00",
  doNotDisturbWeekends: false,
};

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadNotifications(): NotificationConfig {
  if (!isBrowser()) return DEFAULT_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_NOTIFICATIONS;
    const parsed = JSON.parse(raw) as Partial<NotificationConfig>;
    return {
      ...DEFAULT_NOTIFICATIONS,
      ...parsed,
      channels: {
        ...DEFAULT_NOTIFICATIONS.channels,
        ...(parsed.channels ?? {}),
      },
    };
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

export function saveNotifications(cfg: NotificationConfig, audit = true) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
    window.dispatchEvent(new Event("invit:notifications-changed"));
    if (audit) {
      logAudit(
        "notifications.updated",
        `${cfg.recipients.length} destinatario(s)`,
        cfg.digestEnabled ? `Digest ${cfg.digestFrequency}` : undefined,
      );
    }
  } catch {
    /* ignore */
  }
}

export const EVENT_LABEL: Record<NotificationEvent, string> = {
  "stock.low": "Stock bajo umbral",
  "stock.critical": "Stock en nivel crítico",
  "stock.out": "Item agotado",
  "warranty.expiring": "Garantía próxima a vencer",
  "request.created": "Pedido interno creado",
  "request.approved": "Pedido aprobado",
  "request.delivered": "Pedido entregado",
  "order.created": "Orden de compra creada",
  "order.received": "Orden recibida",
  "report.monthly_ready": "Reporte mensual listo para enviar",
};

export const EVENT_DESCRIPTION: Record<NotificationEvent, string> = {
  "stock.low": "Cuando un item cae por debajo de su umbral configurado",
  "stock.critical": "Cuando un item entra en zona crítica (≤ 40% del umbral)",
  "stock.out": "Cuando un item llega a cero unidades",
  "warranty.expiring": "Alertas anticipadas según la ventana configurada",
  "request.created": "Cada vez que un usuario registra un nuevo pedido",
  "request.approved": "Cuando un pedido pasa a esperar compra o estar listo",
  "request.delivered": "Al confirmar entrega y descontar del inventario",
  "order.created": "Cuando se crea una orden de compra en estado draft",
  "order.received": "Cuando una orden es marcada como recibida",
  "report.monthly_ready": "Recordatorio mensual de envío del reporte",
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  email: "Email",
  inapp: "In-app",
  slack: "Slack",
};
export { allOff as ALL_CHANNELS_OFF };
