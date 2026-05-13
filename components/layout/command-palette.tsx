"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Boxes,
  CircleHelp,
  CornerDownLeft,
  Inbox,
  LayoutDashboard,
  Plus,
  Settings,
  ShoppingBag,
  Sun,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useTheme } from "next-themes";
import { flatNav } from "@/lib/navigation";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const handleOpen = () => setOpen(true);
    window.addEventListener("keydown", handleKey);
    window.addEventListener("invit:open-command-palette", handleOpen);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("invit:open-command-palette", handleOpen);
    };
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    queueMicrotask(fn);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      className="top-[18%] w-[640px] max-w-[calc(100%-2rem)] sm:max-w-2xl"
    >
      <CommandInput placeholder="Buscar en inventario, pedidos, acciones…" />
      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center gap-1 py-2">
            <CircleHelp className="size-5 text-muted-foreground/60" />
            <span className="text-sm text-muted-foreground">
              Sin resultados. Probá &ldquo;inventario&rdquo;, &ldquo;compra&rdquo; o &ldquo;garantía&rdquo;.
            </span>
          </div>
        </CommandEmpty>

        <CommandGroup heading="Navegación">
          {flatNav.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`ir ${item.label} ${item.description ?? ""}`}
                onSelect={() => run(() => router.push(item.href))}
              >
                <Icon className="text-muted-foreground" />
                <span>{item.label}</span>
                {item.description && (
                  <span className="ml-2 truncate text-xs text-muted-foreground">
                    {item.description}
                  </span>
                )}
                {item.shortcut && (
                  <CommandShortcut>{item.shortcut}</CommandShortcut>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Acciones rápidas">
          <CommandItem
            value="agregar inventario nuevo item"
            onSelect={() => run(() => router.push("/inventory?new=1"))}
          >
            <Plus className="text-muted-foreground" />
            <span>Agregar item al inventario</span>
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="nueva compra orden"
            onSelect={() => run(() => router.push("/procurement?new=1"))}
          >
            <ShoppingBag className="text-muted-foreground" />
            <span>Crear orden de compra</span>
          </CommandItem>
          <CommandItem
            value="nuevo pedido interno"
            onSelect={() => run(() => router.push("/requests?new=1"))}
          >
            <Inbox className="text-muted-foreground" />
            <span>Registrar nuevo pedido</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Atajos">
          <CommandItem
            value="tema claro oscuro"
            onSelect={() =>
              run(() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark"),
              )
            }
          >
            <Sun className="text-muted-foreground" />
            <span>Cambiar tema (claro / oscuro)</span>
            <CommandShortcut>⌘ ⇧ L</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="inicio dashboard"
            onSelect={() => run(() => router.push("/dashboard"))}
          >
            <LayoutDashboard className="text-muted-foreground" />
            <span>Ir a Inicio</span>
            <CommandShortcut>G I</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="inventario"
            onSelect={() => run(() => router.push("/inventory"))}
          >
            <Boxes className="text-muted-foreground" />
            <span>Ir a Inventario</span>
            <CommandShortcut>G V</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="actividad"
            onSelect={() => run(() => router.push("/activity"))}
          >
            <Activity className="text-muted-foreground" />
            <span>Ir a Actividad</span>
          </CommandItem>
          <CommandItem
            value="ajustes"
            onSelect={() => run(() => router.push("/settings"))}
          >
            <Settings className="text-muted-foreground" />
            <span>Ir a Ajustes</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>

      <div className="flex items-center justify-between border-t border-border/70 px-3 py-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            ↑↓
          </kbd>
          navegar
        </div>
        <div className="flex items-center gap-2">
          <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            <CornerDownLeft className="size-3" />
          </kbd>
          seleccionar
          <span className="px-1">·</span>
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            esc
          </kbd>
          cerrar
        </div>
      </div>
    </CommandDialog>
  );
}

export function openCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("invit:open-command-palette"));
}
