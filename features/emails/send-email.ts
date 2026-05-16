"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { requireUser } from "@/lib/auth/current-user";

const attachmentSchema = z.object({
  filename: z.string().min(1).max(200),
  content: z.string().min(1).max(5_000_000),
});

const inputSchema = z.object({
  to: z.union([z.email(), z.array(z.email()).min(1).max(10)]),
  html: z.string().min(1).max(500_000),
  subject: z.string().min(1).max(200),
  attachments: z.array(attachmentSchema).max(3).optional(),
});

export type SendEmailInput = z.infer<typeof inputSchema>;
export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rateBuckets = new Map<string, number[]>();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const fresh = (rateBuckets.get(key) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (fresh.length >= RATE_MAX) {
    rateBuckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  rateBuckets.set(key, fresh);
  if (rateBuckets.size > 1000) {
    for (const [k, v] of rateBuckets) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateBuckets.delete(k);
    }
  }
  return true;
}

export async function sendEmail(
  raw: SendEmailInput,
): Promise<SendEmailResult> {
  await requireUser();
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress =
    process.env.RESEND_FROM ?? "invIT <onboarding@resend.dev>";

  if (!apiKey) {
    return {
      ok: false,
      error:
        "Falta configurar Resend. Agregá RESEND_API_KEY (y opcionalmente RESEND_FROM) en .env.local y reiniciá el server.",
    };
  }

  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  const h = await headers();
  const rateKey =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "local";

  if (!rateLimit(rateKey)) {
    return {
      ok: false,
      error: "Demasiados envíos en poco tiempo. Probá en un minuto.",
    };
  }

  const { to, html, subject, attachments } = parsed.data;

  try {
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
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      }),
    });
    const data = (await res.json().catch(() => null)) as
      | { id?: string; message?: string; error?: string }
      | null;
    if (!res.ok) {
      return {
        ok: false,
        error: data?.message ?? data?.error ?? `Resend devolvió ${res.status}.`,
      };
    }
    return { ok: true, id: data?.id ?? null };
  } catch {
    return { ok: false, error: "Error inesperado al contactar a Resend." };
  }
}
