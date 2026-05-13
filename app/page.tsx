import Link from "next/link";
import { ArrowRight, Boxes, ShoppingBag, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="relative isolate min-h-svh overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-grid opacity-[0.18]" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/25">
            <Boxes className="size-4" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            invIT
            <span className="ml-1.5 text-muted-foreground font-normal">
              · Gestión IT
            </span>
          </span>
        </div>
        <nav className="hidden gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#features" className="hover:text-foreground transition-colors">
            Capacidades
          </a>
        </nav>
        <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
          Abrir la app <ArrowRight className="size-3.5" />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 pt-16 pb-32 text-center">
        <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="size-3 text-primary" />
          v0.1 · interno Helios Salud
        </div>

        <h1
          className="animate-fade-in-up mt-6 max-w-3xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
          style={{ animationDelay: "60ms" }}
        >
          Tu inventario IT y las compras{" "}
          <span className="bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
            en un solo lugar
          </span>
        </h1>

        <p
          className="animate-fade-in-up mt-5 max-w-xl text-balance text-base text-muted-foreground sm:text-lg"
          style={{ animationDelay: "120ms" }}
        >
          Controlá stock, recibí alertas cuando algo se queda bajo, planificá las
          compras del mes y respondé pedidos del equipo. Pensado para IT, simple
          y al grano.
        </p>

        <div
          className="animate-fade-in-up mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "180ms" }}
        >
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Ir al inicio <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/inventory"
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          >
            Ver inventario
          </Link>
        </div>

        <div
          id="features"
          className="animate-fade-in-up mt-20 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3"
          style={{ animationDelay: "240ms" }}
        >
          {[
            {
              icon: Boxes,
              title: "Inventario claro",
              body: "Stock, ubicaciones, garantías y proveedores en un vistazo.",
            },
            {
              icon: ShoppingBag,
              title: "Compras planificadas",
              body: "Sugerencias automáticas cuando el stock baja del umbral.",
            },
            {
              icon: Sparkles,
              title: "Alertas inteligentes",
              body: "Avisos por stock crítico y garantías por vencer.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="card-elevated group rounded-xl p-5 transition-transform duration-200 hover:-translate-y-0.5"
            >
              <div className="mb-4 grid size-9 place-items-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/20">
                <Icon className="size-4.5" strokeWidth={2} />
              </div>
              <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-8 text-xs text-muted-foreground">
        <div className="flex items-center justify-between border-t border-border pt-6">
          <span>© {new Date().getFullYear()} · invIT</span>
          <span className="font-mono">v0.1.0</span>
        </div>
      </footer>
    </div>
  );
}
