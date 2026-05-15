"use server";

import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
  redirectTo: z.string().optional(),
});

const signUpSchema = z.object({
  name: z.string().min(1, "Ingresá tu nombre"),
  email: z.email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Alias retro-compatible con el form actual.
export type SignInResult = AuthResult;

function collectFieldErrors(
  zodError: z.ZodError,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of zodError.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function signInAction(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los datos.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { ok: false, error: error.message };

  const target =
    parsed.data.redirectTo && parsed.data.redirectTo.startsWith("/")
      ? parsed.data.redirectTo
      : "/dashboard";
  redirect(target);
}

/** Bootstrap del primer user. Cerrado automáticamente cuando hay ≥1
 *  fila en `users`. Usa la admin API con service_role para crear el
 *  user con email pre-confirmado (no requiere click en email). */
export async function signUpFirstUserAction(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const existing = await prisma.user.count();
  if (existing > 0) {
    return {
      ok: false,
      error: "El registro inicial ya fue completado. Iniciá sesión.",
    };
  }

  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: "Revisá los datos.",
      fieldErrors: collectFieldErrors(parsed.error),
    };
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { name: parsed.data.name },
  });

  if (createError) {
    return { ok: false, error: createError.message };
  }

  // Login automático para setear cookies de sesión.
  const supabase = await getSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    return {
      ok: false,
      error: `Cuenta creada pero falló el login: ${signInError.message}`,
    };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
