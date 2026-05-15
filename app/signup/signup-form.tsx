"use client";

import { useActionState } from "react";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  signUpFirstUserAction,
  type AuthResult,
} from "@/lib/auth/actions";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<
    AuthResult | null,
    FormData
  >(signUpFirstUserAction, null);

  const fieldError = (key: string) =>
    state && !state.ok && state.fieldErrors?.[key];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="name" className="text-[12.5px] font-medium">
          Tu nombre
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          autoFocus
          placeholder="Lucas Sosa"
          className={cn(
            "h-10",
            fieldError("name") && "ring-1 ring-status-critical/40",
          )}
        />
        {fieldError("name") && (
          <p className="text-[11.5px] text-status-critical">
            {fieldError("name")}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="email" className="text-[12.5px] font-medium">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@empresa.com"
          className={cn(
            "h-10",
            fieldError("email") && "ring-1 ring-status-critical/40",
          )}
        />
        {fieldError("email") && (
          <p className="text-[11.5px] text-status-critical">
            {fieldError("email")}
          </p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="password" className="text-[12.5px] font-medium">
          Contraseña
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          placeholder="Mínimo 8 caracteres"
          className={cn(
            "h-10",
            fieldError("password") && "ring-1 ring-status-critical/40",
          )}
        />
        {fieldError("password") && (
          <p className="text-[11.5px] text-status-critical">
            {fieldError("password")}
          </p>
        )}
      </div>

      {state && !state.ok && !state.fieldErrors && (
        <div className="flex items-start gap-2 rounded-md bg-status-critical-soft px-3 py-2 text-[12px] text-status-critical ring-1 ring-status-critical/30">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <Button type="submit" size="sm" disabled={pending} className="mt-1 h-10">
        {pending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Creando cuenta…
          </>
        ) : (
          <>
            Crear cuenta y entrar
            <ArrowRight className="size-3.5" />
          </>
        )}
      </Button>
    </form>
  );
}
