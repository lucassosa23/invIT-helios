import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Boxes, Sparkles } from "lucide-react";

import { prisma } from "@/lib/prisma";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

// El guard depende del estado de la tabla `users` en runtime.
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  // Guard duro: si ya existe al menos un user, no se puede crear más
  // desde acá. El owner del workspace usa esta pantalla solo la primera vez.
  const existing = await prisma.user.count();
  if (existing > 0) {
    redirect("/login");
  }

  return (
    <div className="relative isolate flex min-h-svh items-center justify-center overflow-hidden bg-background px-6 py-12 text-foreground">
      <div className="absolute inset-0 -z-10 bg-grid opacity-[0.12]" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 grid size-10 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Boxes className="size-5" strokeWidth={2} />
          </div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Configurá invIT
          </h1>
          <p className="mt-1.5 text-balance text-[13px] text-muted-foreground">
            Es la primera vez que abrís este workspace. Creá tu cuenta y vas a
            quedar como administrador.
          </p>
        </div>

        <div className="card-elevated rounded-xl p-6">
          <SignupForm />
        </div>

        <p className="mt-5 inline-flex w-full items-center justify-center gap-1.5 text-[11.5px] text-muted-foreground/80">
          <Sparkles className="size-3 text-primary" />
          v0.1 · interno Helios Salud
        </p>

        <div className="mt-2 flex items-center justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Volver al inicio
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
