import type { Asset, Location } from "@/lib/fake-data";
import type { PurchaseOrder } from "@/features/procurement/lib/orders";
import type {
  InternalRequest,
  RequestStatus,
} from "@/features/requests/lib/requests";
import type { SectionToggles } from "@/features/reports/lib/report-config";

type RenderOpts = {
  monthLabel: string;
  appUrl: string;
  sections: SectionToggles;
  items: Asset[]; // ya filtrados por exclusiones
  plan?: PurchaseOrder;
  readyOrders: PurchaseOrder[];
  pendingRequests: InternalRequest[];
  locations: Location[];
};

const C = {
  bg: "#0f1216",
  panel: "#161a20",
  panelSoft: "#1c2129",
  border: "#262c36",
  text: "#e6e8ec",
  textMuted: "#8a93a3",
  brand: "#6366f1",
  brandSoft: "#1f2240",
  critical: "#c83737",
  criticalSoft: "#3a1f24",
  low: "#c98318",
  lowSoft: "#3a2a16",
  healthy: "#3aa56e",
  healthySoft: "#1f3a2a",
  info: "#3b82f6",
  infoSoft: "#1d2f4a",
};

const STATUS_PILL: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  out: { label: "Agotado", bg: C.criticalSoft, fg: C.critical },
  critical: { label: "Crítico", bg: C.criticalSoft, fg: C.critical },
  low: { label: "Bajo", bg: C.lowSoft, fg: C.low },
  healthy: { label: "Disponible", bg: C.healthySoft, fg: C.healthy },
};

const REQ_STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pendiente",
  awaiting_purchase: "Esperando compra",
  ready_to_deliver: "Listo para entregar",
  delivered: "Entregado",
  rejected: "Rechazado",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function section(title: string, count: number, body: string): string {
  return `
    <tr>
      <td style="padding:20px 28px 4px 28px;">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:10px;">
          <h2 style="margin:0;font-size:13px;font-weight:700;color:${C.text};text-transform:uppercase;letter-spacing:.12em;">${esc(title)}</h2>
          <span style="font-size:11px;color:${C.textMuted};font-weight:600;letter-spacing:.04em;">${count} ${count === 1 ? "ítem" : "ítems"}</span>
        </div>
        ${body}
      </td>
    </tr>
  `;
}

function inventoryTable(items: Asset[], locations: Location[]): string {
  if (items.length === 0) {
    return `<div style="background:${C.panelSoft};border:1px dashed ${C.border};border-radius:12px;padding:20px;text-align:center;color:${C.textMuted};font-size:12.5px;">Sin alertas — todo el stock está OK.</div>`;
  }
  const locationMap = Object.fromEntries(
    locations.map((l) => [l.id, l.name]),
  );
  const rows = items.slice(0, 30).map((a) => {
    const st = STATUS_PILL[a.status] ?? STATUS_PILL.healthy!;
    const stockColor =
      a.stock === 0
        ? C.critical
        : a.stock <= a.threshold * 0.4
          ? C.critical
          : C.low;
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:13px;">
        <div style="font-weight:600;color:${C.text};">${esc(a.name)}</div>
        <div style="font-size:11px;color:${C.textMuted};margin-top:2px;">${esc(a.brand || "—")} · ${esc(a.category)}</div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:13px;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">
        <span style="color:${stockColor};font-weight:600;">${a.stock}</span><span style="color:${C.textMuted};"> / ${a.threshold}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:12px;color:${C.textMuted};">${esc(locationMap[a.locationId] ?? "—")}</td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};">
        <span style="display:inline-block;padding:3px 9px;border-radius:999px;background:${st.bg};color:${st.fg};font-size:11px;font-weight:600;">${st.label}</span>
      </td>
    </tr>`;
  }).join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;">
    <thead><tr style="background:${C.panelSoft};">
      <th style="padding:10px 12px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:${C.textMuted};font-weight:600;border-bottom:1px solid ${C.border};">Item</th>
      <th style="padding:10px 12px;text-align:right;font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:${C.textMuted};font-weight:600;border-bottom:1px solid ${C.border};">Stock / Mín.</th>
      <th style="padding:10px 12px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:${C.textMuted};font-weight:600;border-bottom:1px solid ${C.border};">Ubicación</th>
      <th style="padding:10px 12px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:${C.textMuted};font-weight:600;border-bottom:1px solid ${C.border};">Estado</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${items.length > 30 ? `<p style="margin:8px 0 0 0;font-size:11px;color:${C.textMuted};">Mostrando 30 de ${items.length}.</p>` : ""}`;
}

function orderBlock(order: PurchaseOrder, accent: string): string {
  const total = order.lines.reduce((s, l) => s + l.qty, 0);
  const linesHtml = order.lines.slice(0, 15).map((l) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid ${C.border};font-size:12.5px;">
        <span style="font-weight:600;color:${C.text};">${esc(l.name)}</span>
        ${l.isNew ? `<span style="margin-left:6px;display:inline-block;padding:1px 6px;border-radius:6px;background:${C.brandSoft};color:${C.brand};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;">nuevo</span>` : ""}
        <div style="font-size:11px;color:${C.textMuted};margin-top:2px;">${esc(l.brand || "—")} · ${esc(l.category)}</div>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid ${C.border};font-size:13px;text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:600;color:${C.text};">× ${l.qty}</td>
    </tr>`).join("");

  return `<div style="background:${C.panelSoft};border:1px solid ${C.border};border-left:3px solid ${accent};border-radius:12px;overflow:hidden;margin-bottom:12px;">
    <div style="padding:12px 16px;border-bottom:1px solid ${C.border};display:flex;align-items:baseline;justify-content:space-between;gap:8px;">
      <div>
        <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;font-weight:700;color:${C.text};">${esc(order.reference)}</span>
        ${order.note ? `<div style="font-size:11px;color:${C.textMuted};margin-top:2px;">${esc(order.note)}</div>` : ""}
      </div>
      <span style="font-size:11px;color:${C.textMuted};font-weight:600;letter-spacing:.04em;">${order.lines.length} ${order.lines.length === 1 ? "ítem" : "ítems"} · ${total} u.</span>
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tbody>${linesHtml}</tbody>
    </table>
    ${order.lines.length > 15 ? `<div style="padding:8px 12px;font-size:11px;color:${C.textMuted};">+ ${order.lines.length - 15} ítems más.</div>` : ""}
  </div>`;
}

function pendingRow(r: InternalRequest): string {
  return `<tr>
    <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-size:12.5px;">
      <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10.5px;text-transform:uppercase;color:${C.textMuted};letter-spacing:.08em;">${esc(r.reference)}</span>
      <div style="margin-top:3px;color:${C.text};"><strong>${esc(r.requesterName)}</strong> · ${r.qty} × ${esc(r.itemName)}</div>
      <div style="font-size:11px;color:${C.textMuted};margin-top:2px;">${esc(r.requesterTeam || "Sin equipo")}${r.reason ? ` · "${esc(r.reason)}"` : ""}</div>
    </td>
    <td style="padding:10px 12px;border-bottom:1px solid ${C.border};text-align:right;">
      <span style="display:inline-block;padding:3px 9px;border-radius:999px;background:${r.status === "pending" ? C.lowSoft : C.infoSoft};color:${r.status === "pending" ? C.low : C.info};font-size:10.5px;font-weight:600;">${REQ_STATUS_LABEL[r.status]}</span>
    </td>
  </tr>`;
}

export function renderMonthlyReport(opts: RenderOpts): string {
  const { monthLabel, appUrl, sections, items, plan, readyOrders, pendingRequests, locations } = opts;

  const lowStockSection = sections.inventory
    ? section(
        "Items que necesitan reposición",
        items.length,
        inventoryTable(items, locations),
      )
    : "";

  const planSection = sections.plan && plan
    ? section("Plan de compras del mes", plan.lines.length, orderBlock(plan, C.brand))
    : "";

  const readySection = sections.readyOrders && readyOrders.length > 0
    ? section(
        "Órdenes listas para enviar",
        readyOrders.length,
        readyOrders.map((o) => orderBlock(o, C.info)).join(""),
      )
    : "";

  const pendingSection = sections.pendingRequests && pendingRequests.length > 0
    ? section(
        "Pedidos del equipo sin resolver",
        pendingRequests.length,
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;background:${C.panelSoft};">
          <tbody>${pendingRequests.slice(0, 20).map(pendingRow).join("")}</tbody>
        </table>
        ${pendingRequests.length > 20 ? `<p style="margin:8px 0 0 0;font-size:11px;color:${C.textMuted};">+ ${pendingRequests.length - 20} más.</p>` : ""}`,
      )
    : "";

  const anyContent = !!(lowStockSection || planSection || readySection || pendingSection);

  // Stats arriba
  const critical = items.filter((i) => i.status === "critical" || i.status === "out").length;
  const planUnits = plan?.lines.reduce((s, l) => s + l.qty, 0) ?? 0;
  const readyUnits = readyOrders.reduce(
    (s, o) => s + o.lines.reduce((s2, l) => s2 + l.qty, 0),
    0,
  );

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>invIT — Reporte mensual · ${esc(monthLabel)}</title>
  </head>
  <body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${C.text};-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:${C.panel};border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid ${C.border};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="display:inline-flex;align-items:center;gap:10px;">
                        <span style="display:inline-block;width:28px;height:28px;background:${C.brand};border-radius:8px;text-align:center;line-height:28px;color:#fff;font-weight:700;font-size:13px;">iT</span>
                        <span style="font-weight:700;font-size:15px;color:${C.text};letter-spacing:-.01em;">invIT</span>
                      </div>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <span style="font-size:11px;color:${C.textMuted};text-transform:uppercase;letter-spacing:.12em;">${esc(monthLabel)}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Hero -->
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:${C.text};letter-spacing:-.01em;line-height:1.25;">Reporte mensual de inventario</h1>
                <p style="margin:0;font-size:13.5px;color:${C.textMuted};line-height:1.55;">Resumen de stock bajo, plan de compras, órdenes listas para enviar y pedidos del equipo sin resolver.</p>
              </td>
            </tr>

            <!-- Stats -->
            <tr>
              <td style="padding:20px 28px 4px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:8px;width:33%;vertical-align:top;">
                      <div style="background:${C.panelSoft};border:1px solid ${C.border};border-radius:12px;padding:14px 16px;">
                        <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:${C.textMuted};font-weight:600;">Críticos / agotados</div>
                        <div style="margin-top:6px;font-size:26px;font-weight:700;color:${C.critical};line-height:1;font-variant-numeric:tabular-nums;">${critical}</div>
                      </div>
                    </td>
                    <td style="padding:0 4px;width:33%;vertical-align:top;">
                      <div style="background:${C.panelSoft};border:1px solid ${C.border};border-radius:12px;padding:14px 16px;">
                        <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:${C.textMuted};font-weight:600;">Plan del mes</div>
                        <div style="margin-top:6px;font-size:26px;font-weight:700;color:${C.brand};line-height:1;font-variant-numeric:tabular-nums;">${planUnits}<span style="font-size:13px;color:${C.textMuted};font-weight:600;"> u.</span></div>
                      </div>
                    </td>
                    <td style="padding-left:8px;width:33%;vertical-align:top;">
                      <div style="background:${C.panelSoft};border:1px solid ${C.border};border-radius:12px;padding:14px 16px;">
                        <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:${C.textMuted};font-weight:600;">Listas para enviar</div>
                        <div style="margin-top:6px;font-size:26px;font-weight:700;color:${C.info};line-height:1;font-variant-numeric:tabular-nums;">${readyUnits}<span style="font-size:13px;color:${C.textMuted};font-weight:600;"> u.</span></div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            ${lowStockSection}
            ${planSection}
            ${readySection}
            ${pendingSection}

            ${!anyContent ? `<tr><td style="padding:32px 28px;text-align:center;color:${C.textMuted};font-size:13px;">Sin contenido para mostrar este mes — todo el inventario está OK y no hay compras pendientes.</td></tr>` : `<tr><td style="height:8px;"></td></tr>`}

            <!-- Footer -->
            <tr>
              <td style="padding:18px 28px;border-top:1px solid ${C.border};background:${C.panelSoft};">
                <p style="margin:0;font-size:11.5px;color:${C.textMuted};line-height:1.6;">Reporte mensual generado desde invIT. Configurá destinatarios y secciones desde <a href="${esc(appUrl)}/reports" style="color:${C.brand};text-decoration:none;">Reporte mensual</a>.</p>
              </td>
            </tr>
          </table>

          <p style="margin:14px 0 0 0;font-size:11px;color:${C.textMuted};text-align:center;">invIT · Helios Salud</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
