"use client";

import { useActionState } from "react";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signInAction, type SignInResult } from "@/lib/auth/actions";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction, pending] = useActionState<
    SignInResult | null,
    FormData
  >(signInAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />

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
          autoFocus
          placeholder="tu@empresa.com"
          className={cn(
            "h-10",
            state && !state.ok && state.fieldErrors?.email && "ring-1 ring-status-critical/40",
          )}
        />
        {state && !state.ok && state.fieldErrors?.email && (
          <p className="text-[11.5px] text-status-critical">
            {state.fieldErrors.email}
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
          autoComplete="current-password"
          placeholder="••••••••"
          className={cn(
            "h-10",
            state && !state.ok && state.fieldErrors?.password && "ring-1 ring-status-critical/40",
          )}
        />
        {state && !state.ok && state.fieldErrors?.password && (
          <p className="text-[11.5px] text-status-critical">
            {state.fieldErrors.password}
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
            Entrando…
          </>
        ) : (
          <>
            Entrar
            <ArrowRight className="size-3.5" />
          </>
        )}
      </Button>
    </form>
  );
}
