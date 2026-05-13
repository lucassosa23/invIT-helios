import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Payload = {
  to?: string | string[];
  html?: string;
  subject?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress =
    process.env.RESEND_FROM ?? "invIT <onboarding@resend.dev>";

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Falta configurar Resend. Agregá RESEND_API_KEY (y opcionalmente RESEND_FROM) en .env.local y reiniciá el server.",
      },
      { status: 503 },
    );
  }

  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json(
      { error: "Body inválido. Esperamos JSON con { to, html, subject }." },
      { status: 400 },
    );
  }

  const to = body.to;
  const html = body.html;
  const subject = body.subject ?? "invIT — Resumen de stock bajo";

  if (!to || (Array.isArray(to) && to.length === 0)) {
    return NextResponse.json(
      { error: "Falta el destinatario (campo 'to')." },
      { status: 400 },
    );
  }
  if (!html || typeof html !== "string") {
    return NextResponse.json(
      { error: "Falta el contenido HTML del email." },
      { status: 400 },
    );
  }

  try {
    // Resend REST API directo — evita agregar la dependencia hasta que el
    // usuario instale `resend`. Si preferís el SDK: `pnpm add resend` y
    // reemplazá este fetch por `new Resend(apiKey).emails.send(...)`.
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            (data && (data.message || data.error)) ||
            `Resend devolvió ${res.status}.`,
        },
        { status: res.status },
      );
    }

    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch (err) {
    console.error("[notify-low-stock] error:", err);
    return NextResponse.json(
      { error: "Error inesperado al contactar a Resend." },
      { status: 500 },
    );
  }
}
