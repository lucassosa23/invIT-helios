import type { Asset, Location } from "@/lib/fake-data";

type RenderOpts = {
  items: Asset[];
  locations: Location[];
  monthLabel: string;
  appUrl: string;
};

const COLORS = {
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
};

const STATUS_LABEL: Record<string, { label: string; bg: string; fg: string }> = {
  out: { label: "Agotado", bg: COLORS.criticalSoft, fg: COLORS.critical },
  critical: { label: "Crítico", bg: COLORS.criticalSoft, fg: COLORS.critical },
  low: { label: "Bajo", bg: COLORS.lowSoft, fg: COLORS.low },
  healthy: { label: "Disponible", bg: "#1f3a2a", fg: COLORS.healthy },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderLowStockEmail({
  items,
  locations,
  monthLabel,
  appUrl,
}: RenderOpts): string {
  const locationMap = Object.fromEntries(locations.map((l) => [l.id, l.name]));

  const critical = items.filter(
    (i) => i.status === "critical" || i.status === "out",
  );
  const low = items.filter((i) => i.status === "low");
  const rows = items.slice(0, 30);

  const td = (
    content: string,
    align: "left" | "right" | "center" = "left",
    extra = "",
  ) =>
    `<td style="padding:10px 12px;border-bottom:1px solid ${COLORS.border};font-size:13px;color:${COLORS.text};text-align:${align};${extra}">${content}</td>`;

  const tbodyRows = rows
    .map((a) => {
      const st = STATUS_LABEL[a.status] ?? STATUS_LABEL.healthy!;
      const pill = `<span style="display:inline-block;padding:3px 9px;border-radius:999px;background:${st.bg};color:${st.fg};font-size:11px;font-weight:600;letter-spacing:.02em;">${st.label}</span>`;
      return `
        <tr>
          ${td(
            `<div style="font-weight:600;color:${COLORS.text};">${escapeHtml(a.name)}</div><div style="font-size:11px;color:${COLORS.textMuted};margin-top:2px;">${escapeHtml(a.brand || "—")} · ${escapeHtml(a.category)}</div>`,
          )}
          ${td(
            `<span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:${a.stock === 0 ? COLORS.critical : a.stock <= a.threshold * 0.4 ? COLORS.critical : COLORS.low};font-weight:600;">${a.stock}</span><span style="color:${COLORS.textMuted};font-family:ui-monospace,SFMono-Regular,Menlo,monospace;"> / ${a.threshold}</span>`,
            "right",
          )}
          ${td(escapeHtml(locationMap[a.locationId] ?? "—"), "left", `color:${COLORS.textMuted};font-size:12px;`)}
          ${td(pill, "left")}
        </tr>
      `;
    })
    .join("");

  const remaining = items.length - rows.length;

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>invIT — Stock bajo · ${escapeHtml(monthLabel)}</title>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${COLORS.text};-webkit-font-smoothing:antialiased;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:${COLORS.panel};border:1px solid ${COLORS.border};border-radius:16px;overflow:hidden;">
            <!-- Header -->
            <tr>
              <td style="padding:24px 28px;border-bottom:1px solid ${COLORS.border};">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="display:inline-flex;align-items:center;gap:10px;">
                        <span style="display:inline-block;width:28px;height:28px;background:${COLORS.brand};border-radius:8px;text-align:center;line-height:28px;color:#fff;font-weight:700;font-size:13px;">iT</span>
                        <span style="font-weight:700;font-size:15px;color:${COLORS.text};letter-spacing:-.01em;">invIT</span>
                      </div>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <span style="font-size:11px;color:${COLORS.textMuted};text-transform:uppercase;letter-spacing:.12em;">${escapeHtml(monthLabel)}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Hero -->
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <h1 style="margin:0 0 6px 0;font-size:22px;font-weight:700;color:${COLORS.text};letter-spacing:-.01em;line-height:1.25;">
                  Items que necesitan reposición
                </h1>
                <p style="margin:0;font-size:13.5px;color:${COLORS.textMuted};line-height:1.55;">
                  Resumen mensual del stock que cayó por debajo del mínimo. Revisalo antes de generar las próximas compras.
                </p>
              </td>
            </tr>

            <!-- Stats -->
            <tr>
              <td style="padding:20px 28px 4px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:8px;width:50%;vertical-align:top;">
                      <div style="background:${COLORS.panelSoft};border:1px solid ${COLORS.border};border-radius:12px;padding:14px 16px;">
                        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:${COLORS.textMuted};font-weight:600;">Crítico / agotado</div>
                        <div style="margin-top:6px;font-size:28px;font-weight:700;color:${COLORS.critical};line-height:1;font-variant-numeric:tabular-nums;">${critical.length}</div>
                      </div>
                    </td>
                    <td style="padding-left:8px;width:50%;vertical-align:top;">
                      <div style="background:${COLORS.panelSoft};border:1px solid ${COLORS.border};border-radius:12px;padding:14px 16px;">
                        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:${COLORS.textMuted};font-weight:600;">Bajo umbral</div>
                        <div style="margin-top:6px;font-size:28px;font-weight:700;color:${COLORS.low};line-height:1;font-variant-numeric:tabular-nums;">${low.length}</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Table -->
            <tr>
              <td style="padding:20px 28px 4px 28px;">
                ${
                  rows.length === 0
                    ? `<div style="background:${COLORS.panelSoft};border:1px dashed ${COLORS.border};border-radius:12px;padding:24px;text-align:center;color:${COLORS.textMuted};font-size:13px;">Sin alertas este mes — todo el stock está dentro del umbral.</div>`
                    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.border};border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;">
                  <thead>
                    <tr style="background:${COLORS.panelSoft};">
                      <th style="padding:10px 12px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:${COLORS.textMuted};font-weight:600;border-bottom:1px solid ${COLORS.border};">Item</th>
                      <th style="padding:10px 12px;text-align:right;font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:${COLORS.textMuted};font-weight:600;border-bottom:1px solid ${COLORS.border};">Stock / Mín.</th>
                      <th style="padding:10px 12px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:${COLORS.textMuted};font-weight:600;border-bottom:1px solid ${COLORS.border};">Ubicación</th>
                      <th style="padding:10px 12px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:.12em;color:${COLORS.textMuted};font-weight:600;border-bottom:1px solid ${COLORS.border};">Estado</th>
                    </tr>
                  </thead>
                  <tbody>${tbodyRows}</tbody>
                </table>`
                }
                ${
                  remaining > 0
                    ? `<p style="margin:10px 0 0 0;font-size:11.5px;color:${COLORS.textMuted};">Mostrando ${rows.length} de ${items.length} items. Entrá a la app para ver el detalle completo.</p>`
                    : ""
                }
              </td>
            </tr>

            <!-- CTAs -->
            <tr>
              <td style="padding:20px 28px 28px 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:8px;">
                      <a href="${escapeHtml(appUrl)}/inventory" style="display:inline-block;background:${COLORS.brand};color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:11px 18px;border-radius:10px;letter-spacing:-.005em;">Abrir inventario</a>
                    </td>
                    <td>
                      <a href="${escapeHtml(appUrl)}/procurement" style="display:inline-block;background:transparent;color:${COLORS.text};text-decoration:none;font-weight:600;font-size:13px;padding:11px 18px;border-radius:10px;border:1px solid ${COLORS.border};letter-spacing:-.005em;">Planificar compras</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:18px 28px;border-top:1px solid ${COLORS.border};background:${COLORS.panelSoft};">
                <p style="margin:0;font-size:11.5px;color:${COLORS.textMuted};line-height:1.6;">
                  Estás recibiendo este resumen porque sos parte del equipo de IT.
                  Configurá los destinatarios y frecuencia desde
                  <a href="${escapeHtml(appUrl)}/settings" style="color:${COLORS.brand};text-decoration:none;">Ajustes</a>.
                </p>
              </td>
            </tr>
          </table>

          <p style="margin:14px 0 0 0;font-size:11px;color:${COLORS.textMuted};text-align:center;">
            invIT · Helios Salud
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
